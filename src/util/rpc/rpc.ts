import uuid from 'uuid/v1'
import { Events } from 'webextension-polyfill-ts/src/generated/events'
import { Runtime } from 'webextension-polyfill-ts'

const RPC_RESPONSE = 'RPC_RESPONSE'
const RPC_REQUEST = 'RPC_REQUEST'

type RPCType = 'RPC_RESPONSE' | 'RPC_REQUEST'

interface RPCObject {
    headers: {
        type: RPCType
        id: string
        name: string
    }
    payload: any
}

type Logger = (msg, obj?) => void

function log(msg: string, obj?: any) {
    // if (window['memex-rpc-debug']) {
    if (true) {
        console['log'](msg, obj ?? {})
    }
}

const createRPCResponseObject = ({ packet, payload }): RPCObject => ({
    headers: {
        type: RPC_RESPONSE,
        id: packet.headers.id,
        name: packet.headers.name,
    },
    payload,
})
const createRPCRequestObject = ({ name, payload }): RPCObject => ({
    headers: {
        type: RPC_REQUEST,
        id: uuid(),
        name: `${name}`,
    },
    payload,
})

interface PendingRequest {
    request: RPCObject
    promise: { resolve: any; reject: any }
}

type RuntimeConnect = (
    extensionId?: string,
    connectInfo?: { name?: string },
) => Runtime.Port
type RuntimeOnConnect = Events.Event<(port: Runtime.Port) => void>

export class PortBasedRPCManager {
    private ports = new Map<string, Runtime.Port>()
    private pendingRequests = new Map<string, PendingRequest>()

    getPortIdForExtBg = () => `e:memex|n:background`
    getPortIdForTab = (tabId: number) =>
        `n:content-script-global->background|t:${tabId}`
    getPortId = (port: Runtime.Port) => {
        if (port.sender?.tab?.id) {
            return `n:${port.name}|t:${port.sender?.tab?.id}`
        }

        if (port.sender?.url) {
            return `n:${port.name}|url:${port.sender?.url}`
        }

        if (port.name) {
            return `e:memex|n:${port.name}`
        }

        console.error({ port })
        throw new Error(
            `Port has neither Sender or a name, something went wrong`,
        )
    }

    constructor(
        private sideName,
        private getRegisteredRemoteFunction,
        private connect: RuntimeConnect,
        private onConnect: RuntimeOnConnect,
    ) {}

    registerConnectionToBackground() {
        log(`RPC::registerRPCConnectionToBackground:: from ${this.sideName}`)

        const port = this.connect(undefined, {
            name: `${this.sideName}->background`,
        })
        this.ports.set(this.getPortIdForExtBg(), port)

        const RPCResponder = this.messageResponder
        port.onMessage.addListener(RPCResponder)

        log(
            `RPC::registerRPCConnectionToBackground:: connected from ${
                this.sideName
            } to port ${this.getPortId(port)}`,
        )
    }

    registerListenerForIncomingConnections() {
        const connected = (port: Runtime.Port) => {
            log(
                `RPC::onConnect::Side:${
                    this.sideName
                } got a connection from ${this.getPortId(port)}`,
            )
            this.ports.set(this.getPortId(port), port)
            port.onMessage.addListener(this.messageResponder)
            port.onDisconnect.addListener((_port) =>
                this.ports.delete(this.getPortId(_port)),
            )
        }

        this.onConnect.addListener(connected)
    }

    public postMessageRequestToExtension(name, payload) {
        const portName = 'e:memex|n:background'
        const port = this.ports.get(portName) // TODO make this more explicit
        if (!port) {
            console.error({ ports: this.ports })
            throw new Error(
                `Could not get a port to message the extension (${portName}) (when trying to call [${name}] )`,
            )
        }
        return this.postMessageRequestToRPC(port, name, payload)
    }

    public postMessageRequestToTab(tabId, name, payload) {
        const port = this.ports.get(this.getPortIdForTab(tabId))
        if (!port) {
            console.error({ ports: this.ports })
            throw new Error(
                `Could not get a port to ${this.getPortIdForTab(
                    tabId,
                )} (when trying to call [${name}]`,
            )
        }
        return this.postMessageRequestToRPC(port, name, payload)
    }

    private postMessageRequestToRPC = async (
        port: Runtime.Port,
        name: string,
        payload: any,
    ) => {
        const _log = (msg, obj?) =>
            log(
                `RPC::messageRequester::Port(${this.getPortId(port)}):: ${msg}`,
                obj,
            )

        const request = createRPCRequestObject({ name, payload })

        // Return the promise for to await for and allow the promise to be resolved by
        // incoming messages
        const pendingRequest = new Promise((resolve, reject) => {
            this.addPendingRequest(request.headers.id, {
                request,
                promise: { resolve, reject },
            })
        })

        port.postMessage(request)
        _log(`Request: ${name} requested`, request)
        const ret = await pendingRequest
        _log(`Request: ${name} returned `, ret)
        return ret
    }

    private addPendingRequest = (id, request) => {
        this.pendingRequests.set(id, request)
    }

    private messageResponder = (packet, port) => {
        const _logPrefix = `RPC::messageResponder::Port:(${this.getPortId(
            port,
        )}) `
        const _log = (text, val?: any) =>
            log(`${_logPrefix} side:${this.sideName} ${text}`, val)

        const { headers, payload } = packet
        const { id, name, type } = headers

        _log(`Packet Received`, packet)
        if (type === RPC_RESPONSE) {
            _log(`Response received ${name}`, payload)
            this.resolvePendingRequest(id, payload)
        } else if (type === RPC_REQUEST) {
            _log(`Request received ${name}`)

            const f = this.getRegisteredRemoteFunction(name)

            if (!f) {
                throw Error(
                    `${_logPrefix} could not find a registered remote function called ${name}`,
                )
            }
            Object.defineProperty(f, 'name', { value: `${name}` })

            const returnPromise = Promise.resolve(
                f({ tab: port?.sender?.tab }, ...payload),
            )
            _log(`Request running`)
            returnPromise.then((value) => {
                _log(`Request response [${name}] ran:`, value)
                port.postMessage(
                    createRPCResponseObject({ packet, payload: value }),
                )
                _log(`Request response [${name}] posted over `, value)
            })
        }
    }

    private resolvePendingRequest = (id, payload) => {
        const request = this.pendingRequests.get(id)

        if (!request) {
            throw new Error(
                `Tried to resolve a request that does not exist (may have already been resolved) id:${id}`,
            )
        }

        request.promise.resolve(payload)
        this.pendingRequests.delete(id)
    }
}
