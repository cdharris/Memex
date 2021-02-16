export const PAUSE_STORAGE_KEY = 'is-logging-paused'

// FIXME: The use of this is inconsistent, the popup checks this before
// allowing the sidebar to open when clicked, (but gives no feedback if not)
// the keyboard shortcuts, e.g. to open sidebar, do not check this
// correction they keyboard shortcuts do check this but inadvertendly via loadcontentscriptcomponent check

export function isLoggable({ url }) {
    // Just remember http(s) pages, ignoring data uris, newtab, ...
    const loggableUrlPatterns = [/^https?:\/\/.+$/, /file=.+(\.pdf)$/]
    const urlEndings = ['.svg', '.jpg', '.png', '.jpeg', '.gif']

    // Ignore all pages that are image files
    for (const urlEnding of urlEndings) {
        if (url.endsWith(urlEnding)) {
            return false
        }
    }

    for (const pattern of loggableUrlPatterns) {
        if (pattern.test(url)) {
            return true
        }
    }
    console.log(`${url} not loggable`)
    return false
}

export const getPauseState = async () => {
    const state = (await browser.storage.local.get(PAUSE_STORAGE_KEY))[
        PAUSE_STORAGE_KEY
    ]

    switch (state) {
        case 0:
        case 1:
            return true
        case 2:
        default:
            return false
    }
}
