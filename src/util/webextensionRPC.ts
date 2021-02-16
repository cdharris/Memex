// A Remote Procedure Call abstraction around the message passing available to
// WebExtension scripts. Usable to call a function in the background script from
// a tab's content script, or vice versa.
//
// The calling side always gets a Promise of the return value. The executing
// (remote) function can be an async function (= it returns a Promise), whose
// completion then will then be waited for.

// Example use:
//
// === background.js ===
// function myFunc(arg) {
//     return arg*2
// }
// makeRemotelyCallable({myFunc})
//
// === content_script.js ===
// const myRemoteFunc = remoteFunction('myFunc')
// myRemoteFunc(21).then(result => { ... result is 42! ... })

import mapValues from 'lodash/fp/mapValues'
import { browser, Runtime } from 'webextension-polyfill-ts'
import { RemoteFunctionImplementations } from 'src/util/remote-functions-background'
import TypedEventEmitter from 'typed-emitter'
import { EventEmitter } from 'events'
import { AuthRemoteEvents } from 'src/authentication/background/types'
import { InitialSyncEvents } from '@worldbrain/storex-sync/lib/integration/initial-sync'
import { ContentSharingEvents } from 'src/content-sharing/background/types'
import uuid from 'uuid/v1'

// Our secret tokens to recognise our messages
const RPC_CALL = '__RPC_CALL__'
const RPC_RESPONSE = '__RPC_RESPONSE__'

export class RpcError extends Error {
    constructor(message) {
        super(message)
        this.name = this.constructor.name
    }
}

export class RemoteError extends Error {
    constructor(message) {
        super(message)
        this.name = this.constructor.name
    }
}

export type RemoteFunctionRole = 'provider' | 'caller'
export type RemoteFunction<
    Role extends RemoteFunctionRole,
    Params,
    Returns = void
> = Role extends 'provider'
    ? (info: { tab: { id: number } }, params: Params) => Promise<Returns>
    : (params: Params) => Promise<Returns>
export type RemotePositionalFunction<
    Role extends RemoteFunctionRole,
    Params extends Array<any>,
    Returns = void
> = Role extends 'provider'
    ? (info: { tab: { id: number } }, ...params: Params) => Promise<Returns>
    : (...params: Params) => Promise<Returns>
export type RemoteFunctionWithExtraArgs<
    Role extends RemoteFunctionRole,
    Params,
    Returns = void
> = Role extends 'provider'
    ? {
          withExtraArgs: true
          function: RemoteFunction<Role, Params, Returns>
      }
    : RemoteFunction<Role, Params, Returns>
export type RemoteFunctionWithoutExtraArgs<
    Role extends RemoteFunctionRole,
    Params,
    Returns = void
> = Role extends 'provider'
    ? {
          withExtraArgs: false
          function: (params: Params) => Promise<Returns>
      }
    : (params: Params) => Promise<Returns>
export function remoteFunctionWithExtraArgs<Params, Returns = void>(
    f: RemoteFunction<'provider', Params, Returns>,
): RemoteFunctionWithExtraArgs<'provider', Params, Returns> {
    return { withExtraArgs: true, function: f }
}
export function remoteFunctionWithoutExtraArgs<Params, Returns = void>(
    f: (params: Params) => Promise<Returns>,
): RemoteFunctionWithoutExtraArgs<'provider', Params, Returns> {
    return { withExtraArgs: false, function: f }
}
export function registerRemoteFunctions<Functions>(
    functions: {
        [Name in keyof Functions]:
            | RemoteFunctionWithExtraArgs<'provider', any, any>
            | RemoteFunctionWithoutExtraArgs<'provider', any, any>
    },
) {
    for (const [name, metadata] of Object.entries(functions)) {
        const typedMetadata = metadata as
            | RemoteFunctionWithExtraArgs<'provider', any, any>
            | RemoteFunctionWithoutExtraArgs<'provider', any, any>
        makeRemotelyCallable(
            { [name]: typedMetadata.function },
            { insertExtraArg: typedMetadata.withExtraArgs },
        )
    }
}

// === Initiating side ===

// The extra options available when calling a remote function
interface RPCOpts {
    tabId?: number
}

// runInBackground and runInTab create a Proxy object that look like the real interface but actually call remote functions
//
// When the Proxy is asked for a property (such as a method)
// return a function that executes the requested method over the RPC interface
//
// Example Usage:
//      interface AnalyticsInterface { trackEvent({}) => any }
//      const analytics = runInBackground<AnalyticsInterface>()
//      analytics.trackEvent(...)

// Runs a remoteFunction in the background script
export function runInBackground<T extends object>(): T {
    return new Proxy<T>({} as T, {
        get(target, property): (...args: any[]) => Promise<any> {
            console.log(`get runInBackground: ${property.toString()}`)

            return async (...args) => {
                // return _remoteFunction(property.toString())(...args)
                console.log(`runInBackground: RUN ${property.toString()}`)
                const retPromise = postMessageRequestToExtension(
                    property.toString(),
                    args,
                )
                const retVal = await Promise.resolve(retPromise)
                console.log(`runInBackground: RET ${retVal}`)
                return retVal
            }
        },
    })
}

// Runs a remoteFunction in the content script on a certain tab
export function runInTab<T extends object>(tabId): T {
    return new Proxy<T>({} as T, {
        get(target, property): any {
            console.log(`runInTab GET: ${property.toString()}`)

            return (...args) => {
                // return _remoteFunction(property.toString(), { tabId })(...args)
                console.log(`runInTab RUN: ${property.toString()}`)
                const ret = postMessageRequestToTab(
                    tabId,
                    property.toString(),
                    args,
                )
                console.log(`runInTab: RET ${ret}`)
                return ret
            }
        },
    })
}

// @depreciated - Don't call this function directly. Instead use the above typesafe version runInBackground
export function remoteFunction(
    funcName: string,
    { tabId }: { tabId?: number } = {},
): any {
    console.log(`depreciated: remoteFunction call for: ${funcName}`)
    if (tabId) {
        return (...args) => postMessageRequestToTab(tabId, funcName, args)
    } else {
        return (...args) => postMessageRequestToExtension(funcName, args)
    }
    // return _remoteFunction(funcName, { tabId })
}

// Create a proxy function that invokes the specified remote function.
// Arguments
// - funcName (required): name of the function as registered on the remote side.
// - options (optional): {
//       tabId: The id of the tab whose content script is the remote side.
//              Leave undefined to call the background script (from a tab).
//   }
function _remoteFunction(funcName: string, { tabId }: { tabId?: number } = {}) {
    const otherSide =
        tabId !== undefined
            ? "the tab's content script"
            : 'the background script'

    console.log(`_remoteFunction being called: ${funcName} tabId: ${tabId}`)

    const f = async function (...args) {
        const message = {
            [RPC_CALL]: RPC_CALL,
            funcName,
            args,
        }

        // Try send the message and await the response.
        let response
        try {
            response =
                tabId !== undefined
                    ? await browser.tabs.sendMessage(tabId, message)
                    : await browser.runtime.sendMessage(message)
            // tabId = await browser.runtime.sendMessage(message)
        } catch (err) {
            console.error(err)
            throw new RpcError(`Extension context has been invalidated`)
        }

        // Check if it was *our* listener that responded.
        if (!response || response[RPC_RESPONSE] !== RPC_RESPONSE) {
            throw new RpcError(
                `RPC got a response from an interfering listener. Wanted ${RPC_RESPONSE} but got ${response?.[RPC_RESPONSE]}. Response:${response}`,
            )
        }

        // If we could not invoke the function on the other side, throw an error.
        if (response.rpcError) {
            console.error(
                `Error occurred on remote side, please check it's console for more details`,
            )
            throw new RpcError(response.rpcError)
        }

        // Return the value or throw the error we received from the other side.
        if (response.errorMessage) {
            console.error(
                `Error occurred on remote side, please check it's console for more details`,
            )
            throw new RemoteError(response.errorMessage)
        } else {
            // TODO: should be able to take this out now, resolved on the remote side
            if (
                typeof response?.returnValue !== 'undefined' &&
                response.returnValue instanceof Promise
            ) {
                response.returnValue = await response?.returnValue
            }
            console.log(`_remoteFunction executed`, { response })
            return response.returnValue
        }
    }

    // Give it a name, could be helpful in debugging
    Object.defineProperty(f, 'name', { value: `${funcName}_RPC` })
    return f
}

// === Executing side ===

const remotelyCallableFunctions =
    typeof window !== 'undefined' ? window['remoteFunctions'] || {} : {}
if (typeof window !== 'undefined') {
    window['remoteFunctions'] = remotelyCallableFunctions
}

function incomingRPCmsg(message, sender): Promise<any> {
    console.log('incomingRPCmsg', { message, sender })

    return new Promise((resolve, reject) => {
        if (
            !message ||
            message[RPC_CALL] !== RPC_CALL ||
            sender?.url === window.location.href
        ) {
            console.log('incomingRPCmsg NOT running (initial condition check)')
            return reject(
                'incomingRPCmsg NOT running (initial condition check)',
            )
        }

        const funcName = message.funcName
        const args = message.hasOwnProperty('args') ? message.args : []
        const func = remotelyCallableFunctions[funcName]

        if (func === undefined) {
            console.error(
                `incomingRPCmsg Received RPC for unknown function: ${funcName}`,
            )
            return resolve({
                rpcError: `No such function registered for RPC: ${funcName}`,
                [RPC_RESPONSE]: RPC_RESPONSE,
            })
        }
        const extraArg = {
            tab: sender.tab,
        }

        // Run the function
        let returnValue
        try {
            returnValue = func(extraArg, ...args)
        } catch (error) {
            console.log(`incomingRPCmsg error`)
            console.error(error)
            return resolve({
                errorMessage: error.message,
                [RPC_RESPONSE]: RPC_RESPONSE,
            })
        }

        returnValue
            .then((val) => {
                console.log(`incomingRPCmsg return `, { returnValue: val })
                return resolve({
                    returnValue: val,
                    [RPC_RESPONSE]: RPC_RESPONSE,
                })
            })
            .catch((error) => {
                console.log(`incomingRPCmsg error `)
                console.error(error)
                return resolve({
                    errorMessage: error.message,
                    [RPC_RESPONSE]: RPC_RESPONSE,
                })
            })
    })
}

// A bit of global state to ensure we only attach the event listener once.
let enabled = false

export function setupRemoteFunctionsImplementations<T>(
    implementations: RemoteFunctionImplementations<'provider'>,
): void {
    for (const [group, functions] of Object.entries(implementations)) {
        makeRemotelyCallableType<typeof functions>(functions)
    }
}

// Register a function to allow remote scripts to call it.
// Arguments:
// - functions (required):
//     An object with a {functionName: function} mapping.
//     Each function will be callable with the given name.
// - options (optional): {
//       insertExtraArg:
//           If truthy, each executed function also receives, as its first
//           argument before the arguments it was invoked with, an object with
//           the details of the tab that sent the message.
//   }
export function makeRemotelyCallableType<T = never>(
    functions: { [P in keyof T]: T[P] },
    { insertExtraArg = false } = {},
) {
    return makeRemotelyCallable(functions, { insertExtraArg })
}
// @Depreciated to call this directly. Should use the above typesafe version
export function makeRemotelyCallable<T>(
    functions: { [P in keyof T]: T[P] },
    { insertExtraArg = false } = {},
) {
    // Every function is passed an extra argument with sender information,
    // so remove this from the call if this was not desired.
    if (!insertExtraArg) {
        // Replace each func with...
        // @ts-ignore
        const wrapFunctions = mapValues((func) =>
            // ...a function that calls func, but hides the inserted argument.
            // @ts-ignore
            (extraArg, ...args) => func(...args),
        )
        // @ts-ignore
        functions = wrapFunctions(functions)
    }

    for (const functionName of Object.keys(functions)) {
        if (remotelyCallableFunctions.hasOwnProperty(functionName)) {
            const error = `RPC function with name ${functionName} has already been registered `
            console.warn(error)
        }
    }
    // Add the functions to our global repetoir.
    Object.assign(remotelyCallableFunctions, functions)
    console.log('assigned to remotelyCallableFunctions this new functions', {
        functions,
    })
}
const delay = (ms: number) => new Promise((_) => setTimeout(_, ms))

// // TODO: Favour this explicitly in script setup?
// export function registerRPCListener({receiver} = {receiver: "background"}) {
//      // Enable the listener if needed.
//      if (!enabled) {
//          //  Important: Do not call addListener() using an async function:
//          // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
//          browser.runtime.onMessage.addListener(incomingRPCmsg)
//          console.log(
//              'enabled global listener browser.runtime.onMessage - registerRPCListener'
//          )
//          enabled = true
//      }
//  }

export class RemoteFunctionRegistry {
    registerRemotelyCallable(functions, { insertExtraArg = false } = {}) {
        makeRemotelyCallable(functions, { insertExtraArg })
    }
}

export function fakeRemoteFunctions(functions: {
    [name: string]: (...args) => any
}) {
    return (name) => {
        if (!functions[name]) {
            throw new Error(
                `Tried to call fake remote function '${name}' for which no implementation was provided`,
            )
        }
        return (...args) => {
            return Promise.resolve(functions[name](...args))
        }
    }
}

export interface RemoteEventEmitter<T> {
    emit: (eventName: keyof T, data: any) => Promise<any>
}
const __REMOTE_EVENT__ = '__REMOTE_EVENT__'
const __REMOTE_EVENT_TYPE__ = '__REMOTE_EVENT_TYPE__'
const __REMOTE_EVENT_NAME__ = '__REMOTE_EVENT_NAME__'

// Sending Side, (e.g. background script)
export function remoteEventEmitter<T>(
    eventType: string,
    { broadcastToTabs = false } = {},
): RemoteEventEmitter<T> {
    const message = {
        __REMOTE_EVENT__,
        __REMOTE_EVENT_TYPE__: eventType,
    }

    if (broadcastToTabs) {
        return {
            emit: async (eventName, data) => {
                const tabs = (await browser.tabs.query({})) ?? []
                for (const { id: tabId } of tabs) {
                    browser.tabs.sendMessage(tabId, {
                        ...message,
                        __REMOTE_EVENT_NAME__: eventName,
                        data,
                    })
                }
            },
        }
    }

    return {
        emit: async (eventName, data) =>
            browser.runtime.sendMessage({
                ...message,
                __REMOTE_EVENT_NAME__: eventName,
                data,
            }),
    }
}

// Receiving Side (e.g. content script, options page, etc)
const remoteEventEmitters: RemoteEventEmitters = {} as RemoteEventEmitters
type RemoteEventEmitters = {
    [K in keyof RemoteEvents]?: TypedRemoteEventEmitter<K>
}
export type TypedRemoteEventEmitter<
    T extends keyof RemoteEvents
> = TypedEventEmitter<RemoteEvents[T]>

// Statically defined types for now, move this to a registry
interface RemoteEvents {
    auth: AuthRemoteEvents
    sync: InitialSyncEvents
    contentSharing: ContentSharingEvents
}

function registerRemoteEventForwarder() {
    if (browser.runtime.onMessage.hasListener(remoteEventForwarder)) {
        return
    }
    browser.runtime.onMessage.addListener(remoteEventForwarder)
}

const remoteEventForwarder = (message, _) => {
    if (message == null || message[__REMOTE_EVENT__] !== __REMOTE_EVENT__) {
        return
    }

    const emitterType = message[__REMOTE_EVENT_TYPE__]
    const emitter = remoteEventEmitters[emitterType]

    if (emitter == null) {
        return
    }

    emitter.emit(message[__REMOTE_EVENT_NAME__], message.data)
}

export function getRemoteEventEmitter<EventType extends keyof RemoteEvents>(
    eventType: EventType,
): RemoteEventEmitters[EventType] {
    const existingEmitter = remoteEventEmitters[eventType]
    if (existingEmitter) {
        return existingEmitter
    }

    const newEmitter = new EventEmitter() as any
    remoteEventEmitters[eventType] = newEmitter
    registerRemoteEventForwarder()
    return newEmitter
}

const RPCRESPONSE = 'RPC_RESPONSE'
const RPCREQUEST = 'RPC_REQUEST'
type RPCType = 'RPC_RESPONSE' | 'RPC_REQUEST'

type OutboundRPCRequests = Map<
    string,
    { request: RPCObject; promise: { resolve: any; reject: any } }
>

interface RPCObject {
    headers: {
        type: RPCType
        id: string
        name: string
    }
    payload: any
}

export const ports = new Map<string, Runtime.Port>()
const outboundRequests = new Map<
    string,
    { request: RPCObject; promise: { resolve: any; reject: any } }
>()
window['memex_debug_ports'] = ports
window['memex_debug_reqs'] = outboundRequests

function log(msg: String, obj?: any) {
    // if (window['memex-rpc-debug']) {
    if (true) {
        console['log'](msg, obj ?? {})
    }
}

const RPCResponseObject = ({ packet, payload }): RPCObject => ({
    headers: {
        type: RPCRESPONSE,
        id: packet.headers.id,
        name: packet.headers.name,
    },
    payload,
})

const RPCRequestObject = ({ name, payload }): RPCObject => ({
    headers: {
        type: RPCREQUEST,
        id: uuid(),
        name: `${name}`,
    },
    payload,
})

function getPortId(port: Runtime.Port) {
    if (port.sender?.tab?.id) {
        return `t:${port.sender?.tab?.id}`
    }

    return `url:${port.sender?.url}`
}
function getPortIdForTab(tabId: number) {
    return `t:${tabId}`
}
function getPortIdForExtensionBackgroundScript() {
    return `e:memex`
}

export function registerRPCListener(sideName) {
    const connected = (port: Runtime.Port) => {
        log(`RPC::onConnect:: ${sideName} got a connection from`, port.sender)
        ports.set(getPortId(port), port)
        port.onMessage.addListener(messageResponder(sideName))
        port.onDisconnect.addListener((_port) => ports.delete(getPortId(_port)))
    }

    browser.runtime.onConnect.addListener(connected)
}

export function registerRPCConnectionToBackground(sideName) {
    log(`RPC::registerRPCConnectionToBackground::${sideName}`)
    const port = browser.runtime.connect(undefined, { name: sideName })
    ports.set(getPortIdForExtensionBackgroundScript(), port)
    port.onMessage.addListener(messageResponder(sideName))
    log(`RPC::registerRPCConnectionToBackground::ports`, ports)
}

function messageResponder(sideName: string) {
    const _log = (text, val?: any) =>
        log(`RPC::messageResponder::${sideName} ${text}`, val)
    return (packet, port: Runtime.Port) => {
        const tabId = port?.sender?.tab?.id
        const { headers, payload } = packet
        const { id, name, type } = headers

        _log(
            `Packet Received from ${
                tabId ? `tabId ${tabId}` : `url ${port?.sender?.url}`
            }`,
            { packet },
        )

        if (type === RPCRESPONSE) {
            _log(`Response received ${name}`, payload)
            // todo validate
            outboundRequests.get(id).promise.resolve(payload)
            outboundRequests.delete(id)
        } else if (type === RPCREQUEST) {
            _log(`Request received`)

            // todo: validate
            const d = remotelyCallableFunctions[name]
            _log(`Requested function [${name}] found as`, d)
            const returnPromise = Promise.resolve(
                d({ tab: port?.sender?.tab }, ...payload),
            )
            _log(`Request running`)
            returnPromise.then((value) => {
                _log(`Request response ran:`, value)
                port.postMessage(RPCResponseObject({ packet, payload: value }))
                _log(`Request response posted`, value)
            })
        }
    }
}

function getRegisteredRemoteFunction(name) {
    return remotelyCallableFunctions[name]
}

// TODO: will different content scripts have different connections? frames? hmm
export function postMessageRequestToTab(tabId, name, payload) {
    const port = ports.get(getPortIdForTab(tabId))
    if (!port) {
        throw new Error(
            `Could not get a port to message tab ${tabId} (when trying to call [${name}]`,
        )
    }
    return postMessageRequestToRPC(port, name, payload)
}

export function postMessageRequestToExtension(name, payload) {
    const port = ports.get(getPortIdForExtensionBackgroundScript())
    if (!port) {
        throw new Error(
            `Could not get a port to message the extension (when trying to call [${name}] )`,
        )
    }
    return postMessageRequestToRPC(port, name, payload)
}

async function postMessageRequestToRPC(
    port: Runtime.Port,
    name: string,
    payload: any,
) {
    const request = RPCRequestObject({ name, payload })
    const promise = completer()

    outboundRequests.set(request.headers.id, { request, promise })
    port.postMessage(request)

    log(`postMessageRequestToRPC:: Posted ${request.headers.name}`, { request })
    const ret = await promise.promise
    log(`postMessageRequestToRPC:: Returned ${request.headers.name}`, {
        request,
        ret,
    })

    return ret
}

export interface PromiseCompleter<R> {
    promise: Promise<R>
    resolve: (value?: R | PromiseLike<R>) => void
    reject: (error?: any, stackTrace?: string) => void
}
function completer(): PromiseCompleter<any> {
    let resolve
    let reject

    const p = new Promise(function (res, rej) {
        resolve = res
        reject = rej
    })

    return { promise: p, resolve, reject }
}
