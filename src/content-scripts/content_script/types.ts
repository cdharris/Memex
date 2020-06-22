import { InPageUIInterface } from 'src/in-page-ui/shared-state/types'
import { RibbonContainerDependencies } from 'src/in-page-ui/ribbon/react/containers/ribbon/types'
import { SidebarContainerDependencies } from 'src/in-page-ui/sidebar/react/containers/sidebar/types'

export interface ContentScriptRegistry {
    registerRibbonScript(main: RibbonScriptMain): Promise<void>
    registerSidebarScript(main: SidebarScriptMain): Promise<void>
    registerHighlightingScript(main: HighlightingScriptMain): Promise<void>
}

export type SidebarScriptMain = (
    dependencies: SidebarContainerDependencies,
) => Promise<void>

export type RibbonScriptMain = (
    options: Omit<
        RibbonContainerDependencies,
        'setSidebarEnabled' | 'getSidebarEnabled'
    > & {
        inPageUI: InPageUIInterface
    },
) => Promise<void>

export type HighlightingScriptMain = () => Promise<void>
