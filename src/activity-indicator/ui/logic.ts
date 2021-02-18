import { UILogic, UIEventHandler, UIEvent } from 'ui-logic-core'
import { ActivityIndicatorInterface } from '../background'
import { runInBackground } from 'src/util/webextensionRPC'

export interface Dependencies {
    openFeedUrl: () => void
}

export interface State {
    hasFeedActivity: boolean
}

export type Events = UIEvent<{
    clickFeedEntry: null
}>

type EventHandler<EventName extends keyof Events> = UIEventHandler<
    State,
    Events,
    EventName
>

export default class Logic extends UILogic<State, Events> {
    private activityIndicatorBG: ActivityIndicatorInterface

    constructor(private dependencies: Dependencies) {
        super()

        this.activityIndicatorBG = runInBackground()
    }

    getInitialState(): State {
        return {
            hasFeedActivity: false,
        }
    }

    init: EventHandler<'init'> = async () => {
        const activityStatus = await this.activityIndicatorBG.checkActivityStatus()

        this.emitMutation({
            hasFeedActivity: { $set: activityStatus === 'has-unseen' },
        })
    }

    clickFeedEntry: EventHandler<'clickFeedEntry'> = async ({
        previousState,
    }) => {
        this.dependencies.openFeedUrl()

        if (previousState.hasFeedActivity) {
            this.emitMutation({ hasFeedActivity: { $set: false } })
            await this.activityIndicatorBG.markActivitiesAsSeen()
        }
    }
}
