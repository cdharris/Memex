import React, { Component, ReactNode, KeyboardEventHandler } from 'react'
import cx from 'classnames'
import qs from 'query-string'

import { remoteFunction } from 'src/util/webextensionRPC'
import extractQueryFilters from 'src/util/nlp-time-filter'
import CommentBoxContainer from 'src/sidebar-overlay/comment-box'
import { Tooltip, ButtonTooltip } from 'src/common-ui/components/'
import {
    shortcuts,
    ShortcutElData,
} from 'src/options/settings/keyboard-shortcuts'
import {
    highlightAnnotations,
    removeHighlights,
} from '../../content_script/highlight-interactions'
import * as utils from 'src/content-tooltip/utils'
import { KeyboardShortcuts, Shortcut } from 'src/content-tooltip/types'
import TextInputControlled from 'src/common-ui/components/TextInputControlled'
const styles = require('./ribbon.css')

export interface Props {
    isExpanded: boolean
    isRibbonEnabled: boolean
    isTooltipEnabled: boolean
    isSidebarOpen: boolean
    isPaused: boolean
    isBookmarked: boolean
    showCommentBox: boolean
    showSearchBox: boolean
    showTagsPicker: boolean
    showCollectionsPicker: boolean
    searchValue: string
    isCommentSaved: boolean
    commentText: string
    shortcutsData?: ShortcutElData[]
    tagManager: ReactNode
    collectionsManager: ReactNode
    openSidebar: (args: any) => void
    closeSidebar: () => void
    handleRibbonToggle: () => void
    handleTooltipToggle: () => void
    handleRemoveRibbon: () => void
    handleBookmarkToggle: () => void
    handlePauseToggle: () => void
    setShowSidebarCommentBox: () => void
    setShowCommentBox: (value: boolean) => void
    setShowTagsPicker: (value: boolean) => void
    setShowCollectionsPicker: (value: boolean) => void
    setShowSearchBox: (value: boolean) => void
    setSearchValue: (value: string) => void
}

interface State {
    shortcutsReady: boolean
}

class Ribbon extends Component<Props, State> {
    static defaultProps = { shortcutsData: shortcuts }

    private keyboardShortcuts: KeyboardShortcuts
    private shortcutsData: Map<string, ShortcutElData>
    private openOverviewTabRPC
    private openOptionsTabRPC
    private ribbonRef: HTMLElement
    private inputQueryEl: HTMLInputElement

    private setInputRef = (el: HTMLInputElement) => (this.inputQueryEl = el)

    state: State = { shortcutsReady: false }

    constructor(props: Props) {
        super(props)
        this.shortcutsData = new Map(
            props.shortcutsData.map(s => [s.name, s]) as [
                string,
                ShortcutElData,
            ][],
        )
        this.openOverviewTabRPC = remoteFunction('openOverviewTab')
        this.openOptionsTabRPC = remoteFunction('openOptionsTab')
    }

    async componentDidMount() {
        this.keyboardShortcuts = await utils.getKeyboardShortcutsState()
        this.setState(() => ({ shortcutsReady: true }))
        this.ribbonRef.addEventListener('mouseleave', this.handleMouseLeave)
    }

    componentWillUnmount() {
        this.ribbonRef.removeEventListener('mouseleave', this.handleMouseLeave)
    }

    private handleMouseLeave = () => {
        if (!this.props.isSidebarOpen) {
            const value = this.props.commentText.length > 0
            this.props.setShowCommentBox(value)
        }
    }

    private handleSearchEnterPress: KeyboardEventHandler<
        HTMLInputElement
    > = event => {
        const queryFilters = extractQueryFilters(this.props.searchValue)
        const queryParams = qs.stringify(queryFilters)

        this.openOverviewTabRPC(queryParams)
    }

    private handleCommentIconBtnClick = () => {
        if (this.props.isSidebarOpen) {
            this.props.setShowSidebarCommentBox()
            return
        }
        this.props.setShowCommentBox(!this.props.showCommentBox)
    }

    private toggleHighlights = () => {
        if (this.props.isTooltipEnabled) {
            removeHighlights()
        } else {
            this.fetchAndHighlightAnnotations()
        }

        this.props.handleTooltipToggle()
    }

    private fetchAndHighlightAnnotations = async () => {
        const annotations = await remoteFunction('getAllAnnotationsByUrl')({
            url: window.location.href,
        })
        const highlights = annotations.filter(annotation => annotation.selector)
        highlightAnnotations(highlights, this.props.openSidebar)
    }

    private getTooltipText(name: string): string {
        const elData = this.shortcutsData.get(name)
        const short: Shortcut = this.keyboardShortcuts[name]

        if (!elData) {
            return ''
        }

        let source = elData.tooltip

        if (['createBookmark', 'toggleSidebar'].includes(name)) {
            source = this.props.isBookmarked
                ? elData.toggleOff
                : elData.toggleOn
        }

        return short.shortcut && short.enabled
            ? `${source} (${short.shortcut})`
            : source
    }

    render() {
        if (!this.state.shortcutsReady) {
            return false
        }

        return (
            <div
                ref={ref => (this.ribbonRef = ref)}
                className={cx(styles.ribbon, {
                    [styles.ribbonExpanded]:
                        this.props.isExpanded || this.props.isSidebarOpen,
                })}
            >
                {(this.props.isExpanded || this.props.isSidebarOpen) && (
                    <React.Fragment>
                        <div className={styles.generalActions}>
                            <ButtonTooltip
                                tooltipText="Open Dashboard"
                                position="left"
                            >
                                <button
                                    onClick={() => this.openOverviewTabRPC()}
                                    className={cx(styles.button, styles.logo)}
                                />
                            </ButtonTooltip>

                            <ButtonTooltip
                                tooltipText={this.getTooltipText(
                                    'toggleSidebar',
                                )}
                                position="left"
                            >
                                <button
                                    className={cx(styles.button, {
                                        [styles.arrow]: !this.props
                                            .isSidebarOpen,
                                        [styles.arrowReverse]: this.props
                                            .isSidebarOpen,
                                    })}
                                    onClick={() =>
                                        !this.props.isSidebarOpen
                                            ? this.props.openSidebar({})
                                            : this.props.closeSidebar()
                                    }
                                />
                            </ButtonTooltip>

                            <div>
                                <ButtonTooltip
                                    tooltipText={'Search Memex via Dashboard'}
                                    position="left"
                                >
                                    <button
                                        className={cx(
                                            styles.button,
                                            styles.search,
                                        )}
                                        onClick={() => {
                                            this.props.setShowSearchBox(
                                                !this.props.showSearchBox,
                                            )
                                            this.inputQueryEl.focus()
                                        }}
                                    />
                                    {this.props.showSearchBox && (
                                        <Tooltip
                                            position="left"
                                            itemClass={styles.tooltipLeft}
                                            toolTipType="searchBar"
                                        >
                                            <form>
                                                <span
                                                    className={styles.search}
                                                />
                                                <TextInputControlled
                                                    autoFocus={false}
                                                    setRef={this.setInputRef}
                                                    className={
                                                        styles.searchInput
                                                    }
                                                    name="query"
                                                    placeholder="Search your Memex"
                                                    autoComplete="off"
                                                    onChange={
                                                        this.props
                                                            .setSearchValue
                                                    }
                                                    specialHandlers={[
                                                        {
                                                            test: e =>
                                                                e.key ===
                                                                'Enter',
                                                            handle: e =>
                                                                this.handleSearchEnterPress(
                                                                    e,
                                                                ),
                                                        },
                                                    ]}
                                                    defaultValue={
                                                        this.props.searchValue
                                                    }
                                                    type={'input'}
                                                />
                                            </form>
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                            </div>
                        </div>
                        <div className={styles.pageActions}>
                            <ButtonTooltip
                                tooltipText={this.getTooltipText(
                                    'createBookmark',
                                )}
                                position="left"
                            >
                                <button
                                    className={cx(styles.button, {
                                        [styles.bookmark]: this.props
                                            .isBookmarked,
                                        [styles.notBookmark]: !this.props
                                            .isBookmarked,
                                    })}
                                    onClick={() =>
                                        this.props.handleBookmarkToggle()
                                    }
                                />
                            </ButtonTooltip>
                            <div>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'addComment',
                                    )}
                                    position="left"
                                >
                                    <button
                                        className={cx(
                                            styles.button,
                                            styles.comments,
                                        )}
                                        onClick={this.handleCommentIconBtnClick}
                                    />
                                    {this.props.showCommentBox && (
                                        <Tooltip position="left">
                                            <CommentBoxContainer env="inpage" />
                                        </Tooltip>
                                    )}
                                    {this.props.isCommentSaved && (
                                        <Tooltip
                                            position="left"
                                            itemClass={styles.commentSaved}
                                        >
                                            <div className={styles.saveBox}>
                                                <span
                                                    className={styles.saveIcon}
                                                />
                                                <span
                                                    className={styles.saveText}
                                                >
                                                    Saved!
                                                </span>
                                            </div>
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                            </div>

                            <div>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText('addTag')}
                                    position="left"
                                >
                                    <button
                                        className={cx(
                                            styles.button,
                                            styles.tag,
                                        )}
                                        onClick={() =>
                                            this.props.setShowTagsPicker(
                                                !this.props.showTagsPicker,
                                            )
                                        }
                                    />
                                    {this.props.showTagsPicker && (
                                        <Tooltip position="left">
                                            {this.props.tagManager}
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                            </div>

                            <div>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'addToCollection',
                                    )}
                                    position="left"
                                >
                                    <button
                                        className={cx(
                                            styles.button,
                                            styles.collection,
                                        )}
                                        onClick={() =>
                                            this.props.setShowCollectionsPicker(
                                                !this.props
                                                    .showCollectionsPicker,
                                            )
                                        }
                                    />
                                    {this.props.showCollectionsPicker && (
                                        <Tooltip
                                            position="left"
                                            itemClass={styles.collectionDiv}
                                        >
                                            {this.props.collectionsManager}
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                            </div>
                        </div>
                        <div className={styles.settingsActions}>
                            <ButtonTooltip
                                tooltipText={
                                    'Remove Toolbar once. Disable permanently with button below.'
                                }
                                position="left"
                            >
                                <button
                                    className={cx(styles.button, styles.cancel)}
                                    onClick={() =>
                                        this.props.handleRemoveRibbon()
                                    }
                                />
                            </ButtonTooltip>

                            <ButtonTooltip
                                tooltipText="Disable this Toolbar (You can still use keyboard shortcuts)"
                                position="left"
                            >
                                <button
                                    className={cx(
                                        styles.button,
                                        styles.ribbonIcon,
                                        {
                                            [styles.ribbonOn]: this.props
                                                .isRibbonEnabled,
                                            [styles.ribbonOff]: !this.props
                                                .isRibbonEnabled,
                                        },
                                    )}
                                    onClick={() =>
                                        this.props.handleRibbonToggle()
                                    }
                                />
                            </ButtonTooltip>

                            <ButtonTooltip
                                tooltipText="Toggle highlights"
                                position="left"
                            >
                                <button
                                    onClick={this.toggleHighlights}
                                    className={cx(
                                        styles.button,
                                        styles.ribbonIcon,
                                        {
                                            [styles.highlightsOn]: this.props
                                                .isTooltipEnabled,
                                            [styles.highlightsOff]: !this.props
                                                .isTooltipEnabled,
                                        },
                                    )}
                                />
                            </ButtonTooltip>

                            <ButtonTooltip
                                tooltipText="Pause indexing"
                                position="left"
                            >
                                <button
                                    className={cx(styles.button, {
                                        [styles.playIcon]: this.props.isPaused,
                                        [styles.pauseIcon]: !this.props
                                            .isPaused,
                                    })}
                                    onClick={() =>
                                        this.props.handlePauseToggle()
                                    }
                                />
                            </ButtonTooltip>

                            <ButtonTooltip
                                tooltipText="Settings"
                                position="left"
                            >
                                <button
                                    className={cx(
                                        styles.button,
                                        styles.settings,
                                    )}
                                    onClick={() =>
                                        this.openOptionsTabRPC('settings')
                                    }
                                />
                            </ButtonTooltip>
                        </div>
                    </React.Fragment>
                )}
            </div>
        )
    }
}

export default Ribbon
