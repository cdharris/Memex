import { NotifOpts } from 'src/util/notifications'

export type CreateNotification = (
    notifOptions: Partial<NotifOpts>,
    onClick?: (f) => typeof f,
) => Promise<void>

export interface NotificationInterface {
    createNotification: CreateNotification
}
