import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ErrorBoundary, RuntimeError } from 'src/common-ui/components'
import { TwitterObserver, addPostButton } from '../observers'
import SaveToMemexContainer from './components'
import configureStore from '../store'
import AnnotationsManager from 'src/sidebar-overlay/annotations-manager'

export default function initTwitterIntegration({
    annotationsManager,
}: {
    annotationsManager: AnnotationsManager
}) {
    const store = configureStore()

    const twitterObserver = new TwitterObserver({
        document,
    })

    const twitterListener = (uiVersion: number) => ({
        element,
    }: {
        element: HTMLElement
    }) => {
        console.log('New Tweet: ', uiVersion, element)

        const target = document.createElement('div')

        target.setAttribute('id', 'memexButton')
        if (uiVersion === 1) {
            target.classList.add(
                ...['ProfileTweet-action', 'ProfileTweet-action--stm'],
            )
        } else if (uiVersion === 2) {
            target.style.display = 'flex'
        }
        target.addEventListener('click', e => e.stopPropagation())

        const destroy = () => {
            const btn = element.querySelector('#memexButton')

            if (btn) {
                btn.parentNode.removeChild(btn)
            }
        }

        ReactDOM.render(
            <Provider store={store}>
                <ErrorBoundary component={RuntimeError}>
                    <SaveToMemexContainer
                        element={element}
                        annotationsManager={annotationsManager}
                    />
                </ErrorBoundary>
            </Provider>,
            target,
        )

        addPostButton({ target, element, destroy, uiVersion })
    }

    twitterObserver.events.on('newTweet-UIv1', twitterListener(1))

    twitterObserver.events.on('newTweet-UIv2', twitterListener(2))
}
