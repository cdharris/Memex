import ImportContainer from './imports'
import SettingsContainer from './containers/settings'
import BackupSettingsContainer from './backup'
import Privacy from './privacy'
import Statistics from './statistics'
import Settings from './settings'
import Overview from '../overview'
import UserScreen from '../authentication/components/UserScreen'
import { SubscribeModal } from '../authentication/components/Subscription/SubscribeModal'
import { FeaturesOptInScreen } from '../feature-opt-in/ui/components/FeaturesOptInScreen'

export default [
    {
        name: 'Usage Statistics',
        pathname: '/statistics',
        component: Statistics,
        hideFromSidebar: true,
    },
    {
        name: 'Go back to Search',
        pathname: '/overview',
        component: Overview,
        icon: 'search',
        useOwnLayout: true,
    },

    {
        name: 'Subscribe',
        pathname: '/subscribe',
        component: SubscribeModal,
        hideFromSidebar: true,
    },
    {
        name: 'Settings',
        pathname: '/settings',
        component: Settings,
        icon: 'settings',
    },
    {
        name: 'Import',
        pathname: '/import',
        component: ImportContainer,
        icon: 'import',
    },
    {
        name: 'Backup & Restore',
        pathname: '/backup',
        component: BackupSettingsContainer,
        icon: 'backup',
    },
    {
        name: 'Blocklist',
        pathname: '/blocklist',
        component: SettingsContainer,
        icon: 'block',
    },
    {
        name: 'Privacy',
        pathname: '/privacy',
        component: Privacy,
        icon: 'privacy',
    },
    // {
    //     name: 'Memex Team',
    //     pathname: 'https://worldbrain.io/team',
    //     icon: 'team',
    //     isExternal: true,
    // },
    {
        name: 'Help',
        pathname: 'https://worldbrain.io/help',
        icon: 'help',
        isExternal: true,
    },
    {
        name: 'Tutorial',
        pathname:
            'https://www.notion.so/worldbrain/Tutorials-fa44dcbf41654ceb910c5952b6097f8d',
        isExternal: true,
        icon: 'info',
    },
    {
        name: 'User Account',
        pathname: '/auth',
        icon: 'settings',
        component: UserScreen,
        hideFromSidebar: true,
    },
    {
        name: 'Opt In Features',
        pathname: '/features',
        icon: 'settings',
        component: FeaturesOptInScreen,
        hideFromSidebar: true,
    },
]
