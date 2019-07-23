import { EventEmitter } from 'events'

export default class TwitterObserver {
    private observer: MutationObserver
    private observerConfig: MutationObserverInit
    public events: EventEmitter

    constructor({ document }: { document: Document }) {
        this.events = new EventEmitter()

        this.observerConfig = {
            childList: true,
            attributes: false,
            characterData: false,
            subtree: true,
        }

        this.observer = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type === 'childList') {
                    document
                        .querySelectorAll(
                            '.tweet.js-actionable-tweet:not(.MemexAdded)',
                        )
                        .forEach(element =>
                            this.events.emit('newTweet-UIv1', { element }),
                        )
                    document
                        .querySelectorAll('article:not(.MemexAdded)')
                        .forEach(element =>
                            this.events.emit('newTweet-UIv2', { element }),
                        )
                }
            })
        })

        this.observer.observe(document, this.observerConfig)
    }

    public stop() {
        this.observer.disconnect()
    }
}
export const addPostButton = ({
    target,
    element,
    destroy,
    uiVersion,
}: {
    target: Element
    element: Element
    destroy: () => void
    uiVersion: number
}) => {
    let actionList
    if (uiVersion === 1) {
        actionList = element.querySelector('.ProfileTweet-actionList')
    } else if (uiVersion === 2) {
        const svgButtons = element.querySelectorAll('svg')
        actionList =
            svgButtons[svgButtons.length - 1].parentNode.parentNode.parentNode
                .parentNode.parentNode
    }
    if (!actionList) {
        return
    }

    destroy()

    actionList.appendChild(target)
    element.classList.add('MemexAdded')
}
