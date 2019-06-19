import { createAction } from 'redux-act'

import { remoteFunction, remoteFunctionTyped } from '../../util/webextensionRPC'
import { Thunk } from '../types'
import * as selectors from './selectors'
import * as popup from '../selectors'
import { handleDBQuotaErrors } from 'src/util/error-handler'
import {
    CreateNotification,
    NotificationInterface,
} from 'src/util/notifications-types'

const createBookmarkRPC = remoteFunction('addPageBookmark')
const deleteBookmarkRPC = remoteFunction('delPageBookmark')
const createNotifRPC = remoteFunctionTyped<
    CreateNotification,
    'createNotification'
>('createNotification')

export const setIsBookmarked = createAction<boolean>('bookmark/setIsBookmarked')

export const toggleBookmark: () => Thunk = () => async (dispatch, getState) => {
    const state = getState()
    const url = popup.url(state)
    const tabId = popup.tabId(state)
    const hasBookmark = selectors.isBookmarked(state)
    dispatch(setIsBookmarked(!hasBookmark))

    const bookmarkRPC = hasBookmark ? deleteBookmarkRPC : createBookmarkRPC
    try {
        await bookmarkRPC({ url, tabId })
    } catch (err) {
        dispatch(setIsBookmarked(hasBookmark))
        handleDBQuotaErrors(
            error =>
                createNotifRPC({
                    requireInteraction: false,
                    title: 'Memex error: starring page',
                    message: error.message,
                }),
            () => remoteFunction('dispatchNotification')('db_error'),
        )(err)
    }
}
