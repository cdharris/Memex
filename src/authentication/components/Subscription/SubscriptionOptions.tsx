import * as React from 'react'
import { UserSubscription } from 'src/authentication/ui/user-subscription'
import Button from 'src/popup/components/Button'
import { Helmet } from 'react-helmet'
import { SubscriptionPriceBox } from 'src/authentication/components/Subscription/SubscriptionPriceBox'
import { UserPlan } from '@worldbrain/memex-common/lib/subscriptions/types'
import { AuthenticatedUser } from '@worldbrain/memex-common/lib/authentication/types'
import { auth } from 'src/util/remote-functions-background'
const chargeBeeScriptSource = 'https://js.chargebee.com/v2/chargebee.js'

//
export const subscriptionConfig = {
    site:
        process.env.NODE_ENV !== 'production'
            ? 'worldbrain-test'
            : 'worldbrain',
}

interface Props {
    user: AuthenticatedUser | null
    onClose?: () => void
    subscriptionChanged: () => void
}
interface State {
    subscribed: boolean
}
export class SubscriptionOptions extends React.Component<Props, State> {
    chargebeeInstance: any
    userSubscription: UserSubscription

    public state = { subscribed: false }

    async componentDidMount() {
        this.setState({ subscribed: await auth.hasSubscribedBefore() })
    }

    _initChargebee = (): void => {
        if (this.chargebeeInstance != null) {
            return
        }
        // todo: Handle offline cases better
        if (window['Chargebee'] == null) {
            return console.error(
                'Could not load payment provider as external script is not currently loaded.',
            )
        }
        this.chargebeeInstance = window['Chargebee'].init({
            site: subscriptionConfig.site,
        })
        this.userSubscription = new UserSubscription(this.chargebeeInstance)
    }

    openPortal = async () => {
        this._initChargebee()
        const portalEvents = await this.userSubscription.manageUserSubscription()

        portalEvents.addListener('closed', async () => {
            await auth.refreshUserInfo()
            this.props.onClose()
        })
        portalEvents.addListener('changed', () => {
            this.props.subscriptionChanged()
            this.props.onClose()
        })
    }

    openCheckoutBackup = async () => {
        return this.openCheckout('pro-1-device-yrl')
    }

    openCheckoutBackupSync = async () => {
        return this.openCheckout('pro-1-device')
    }

    openCheckout = async (planId: UserPlan) => {
        this._initChargebee()
        const subscriptionEvents = await this.userSubscription.checkoutUserSubscription(
            { planId },
        )
        subscriptionEvents.addListener('closed', async () => {
            await auth.refreshUserInfo()
            this.props.onClose()
        })
        subscriptionEvents.addListener('changed', async () => {
            await auth.refreshUserInfo()
            this.props.subscriptionChanged()
            this.props.onClose()
        })
    }

    render() {
        return (
            <div className={''}>
                <Helmet>
                    <script src={chargeBeeScriptSource} />
                </Helmet>
                <h1 className={''}>Subscribe</h1>

                <div style={styles.subscriptionOptionsContainer}>
                    <SubscriptionPriceBox
                        key={'SubscriptionBoxFree'}
                        onClick={undefined}
                        title={'Free'}
                        infoItems={[
                            'All offline features',
                            'Manual Backups',
                            'To your favorite cloud',
                            'No account necessary',
                        ]}
                    />
                    <SubscriptionPriceBox
                        key={'SubscriptionBoxBackups'}
                        onClick={_ => this.openCheckoutBackup()}
                        title={'Auto Backups'}
                        infoItems={[
                            "Everything in 'Free'",
                            'Automatic Backups every 15 min',
                            'To your favorite cloud',
                            'No account necessary',
                        ]}
                    />
                    <SubscriptionPriceBox
                        key={'SubscriptionBoxSync'}
                        onClick={_ => this.openCheckoutBackupSync()}
                        title={'Auto Backup and Mobile Sync'}
                        infoItems={[
                            'Everything in Free & Auto Backups',
                            'Sync with mobile phone',
                            'IOS and Android App',
                        ]}
                    />
                </div>

                <Button onClick={_ => this.openPortal()}>
                    Manage Existing Subscription
                </Button>
            </div>
        )
    }
}

const styles = {
    subscriptionOptionsContainer: {
        display: 'flex',
    },
}
