import BookmarksStorage from './storage'
import { StorageManager } from 'src/search/types'
import { makeRemotelyCallableTyped } from 'src/util/webextensionRPC'
import normalizeUrl from 'src/util/encode-url-for-id'
import { BookmarkInterface } from './types'
import { RemoteFunctions } from 'src/util/webextensionRPC-types'

export default class BookmarksBackground implements BookmarkInterface {
    private storage: BookmarksStorage

    constructor({ storageManager }: { storageManager: StorageManager }) {
        this.storage = new BookmarksStorage({ storageManager })
    }

    setupRemoteFunctions() {
        makeRemotelyCallableTyped({
            addBookmark: this.addBookmark.bind(this),
            delBookmark: this.delBookmark.bind(this),
        })
    }

    async addBookmark({ url }) {
        return this.storage.addBookmark({ url: normalizeUrl(url) })
    }

    async delBookmark({ url }) {
        return this.storage.delBookmark({ url: normalizeUrl(url) })
    }
}
