import { BookmarkInterface } from 'src/bookmarks/background/types'
import { NotificationInterface } from 'src/util/notifications-types'

export type RemoteFunctions = Partial<BookmarkInterface & NotificationInterface>
