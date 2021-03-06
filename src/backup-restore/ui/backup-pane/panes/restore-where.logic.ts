import {
    reactEventHandler,
    handleEvent,
    compositeEventProcessor,
} from 'src/util/ui-logic'

interface Providers {
    [provider: string]: boolean
}
interface State {
    provider: 'google-drive' | 'local' | 'filesystem'
    valid: boolean
    backupPath: string
    backupHandle: any
    overlay: string
}

export const PROVIDERS: Providers = {
    'google-drive': true,
    local: true,
    filesystem: true,
}

export const INITIAL_STATE: State = {
    provider: null,
    valid: false,
    backupPath: null,
    backupHandle: null,
    overlay: null,
}

/**
 * Reducer function to find the current valid state.
 */
const isValid = (provider: string, backupPath: string, backupHandle): boolean =>
    provider === 'google-drive' ||
    (provider === 'local' && !!backupPath) ||
    (provider === 'filesytem' && !!backupHandle)

export const processEvent = compositeEventProcessor({
    onChangeOverlay: ({ event }) => {
        const overlay = event.overlay
        return {
            updateState: { overlay },
        }
    },
    onChangeBackupPath: ({ state, event }) => {
        const { backupPath, backupHandle } = event
        const valid = isValid(state.provider, backupPath, backupHandle)

        return {
            updateState: { backupPath, valid },
        }
    },
    onProviderChoice: ({ state, event }) => {
        const { backupPath, backupHandle } = event
        // const valid = !!PROVIDERS[provider]
        const valid = isValid(state.provider, backupPath, backupHandle)

        return {
            updateState: { provider: state.provider, valid },
        }
    },
    onConfirm: ({ state, event }) => {
        return {
            dispatch: state.valid && {
                type: 'onChoice',
                args: {
                    choice: state.provider,
                },
            },
        }
    },
})

export { reactEventHandler, handleEvent }
