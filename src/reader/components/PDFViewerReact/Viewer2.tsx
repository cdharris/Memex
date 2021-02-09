import React, { Component } from 'react'
import { browser } from 'webextension-polyfill-ts'

import {
    LinkTarget,
    GlobalWorkerOptions,
    getDocument,
} from 'pdfjs-dist/es5/build/pdf.min'

import {
    EventBus,
    PDFFindController,
    PDFLinkService,
    PDFViewer,
} from 'pdfjs-dist/es5/web/pdf_viewer'
import VendorViewerCSS from 'src/reader/components/PDFViewerReact/VendorViewerCSS'
import { remoteFunction } from 'src/util/webextensionRPC'
import { renderHighlights } from 'src/highlighting/ui/highlight-interactions'

class Viewer extends Component<{}, {}> {
    render() {
        return (
            <PDFContainer>
                <PDFDocument />
            </PDFContainer>
        )
    }
}

class PDFContainer extends Component<{}, {}> {
    render() {
        return (
            <VendorViewerCSS>
                <div
                    id="pdf-viewer-container"
                    style={{
                        position: 'absolute',
                        overflow: 'auto',
                        top: '0',
                        width: '100%',
                        height: '100%',
                    }}
                    className="viewerContainer"
                    itemProp="mainContentOfPage"
                >
                    <div>
                        <div id="pdf-viewer-content" className="">
                            <div />
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </VendorViewerCSS>
        )
    }
}

interface PDFViewerAppComponents {
    viewer: PDFViewer
    findController: PDFFindController
    linkService: PDFLinkService
    eventBus: EventBus
}

interface PDFElements {
    container: HTMLElement
    viewer: HTMLElement
}

function initializeViewerComponents(
    onPagesInit: () => any,
): PDFViewerAppComponents & {
    elements: PDFElements
} {
    GlobalWorkerOptions.workerSrc = browser.extension.getURL(
        '/build/pdf.worker.min.js',
    )
    const eventBus = new EventBus({ dispatchToDOM: false })
    // const overlayManager = new OverlayManager();
    // const renderingQueue = new PDFRenderingQueue();

    const linkService = new PDFLinkService({
        externalLinkTarget: LinkTarget.BLANK,
        eventBus,
    })

    const findController = new PDFFindController({
        linkService,
        eventBus,
    })

    const elements = {
        container: document.getElementById('pdf-viewer-container'),
        viewer: document.getElementById('pdf-viewer-content'),
    }

    const viewerOptions = {
        ...elements,
        linkService,
        findController,
        eventBus,
        // Use Enhanced text layer mode
        textLayerMode: 2,
    }

    eventBus.on('pagesinit', onPagesInit)
    const viewer = new PDFViewer(viewerOptions)
    // renderingQueue.setViewer(viewer);
    // renderingQueue.onIdle = () => viewer.cleanup();
    linkService.setViewer(viewer)

    // this.pdfThumbnailViewer = new PDFThumbnailViewer({
    //     container: appConfig.sidebar.thumbnailView,
    //     eventBus,
    //     renderingQueue: pdfRenderingQueue,
    //     linkService: pdfLinkService,
    //     l10n: this.l10n,
    // });

    // pdfRenderingQueue.setThumbnailViewer(this.pdfThumbnailViewer);

    // this.findBar = new PDFFindBar(appConfig.findBar, eventBus, this.l10n);

    return { viewer, findController, linkService, eventBus, elements }
}

class PDFDocument extends Component<{}, {}> {
    pdfViewerComponents: PDFViewerAppComponents

    componentDidMount() {
        this.pdfViewerComponents = initializeViewerComponents(this.onPagesInit)
        this.loadDocument()
        window['test_pdfViewerApp'] = this.pdfViewerComponents
    }

    loadDocument = async () => {
        const url = 'https://arxiv.org/pdf/2102.02864.pdf'
        const documentLoadingTask = getDocument({ url, docBaseURL: url })
        const document = await documentLoadingTask.promise
        this.pdfViewerComponents.viewer.setDocument(document)
        this.pdfViewerComponents.linkService.setDocument(document)
    }

    onPagesInit = async () => {
        console.log('onPagesInit')
        // load annotations
        // this.pdfViewerLoaded()
        this.loadAndRenderAnnotations('https://arxiv.org/pdf/2102.02864.pdf')
    }

    /*    pdfViewerLoaded = async ({ url, title }) => {
        // load annotations
        await this.loadAndRenderAnnotations(url, ({ activeUrl }) => {
            this.handleAnnotationSidebarToggle({
                pageUrl: url,
                pageTitle: title,
            })
            this.setActiveAnnotationUrl(activeUrl)
        })
        await insertTooltip({
            inPageUI: this.state.pdfUI,
            annotationsManager: new AnnotationsManager(),
            toolbarNotifications: null,
        })
    }*/

    loadAndRenderAnnotations = async (
        fullUrl: string,
        onAnnotationClick?: (args: { activeUrl?: string }) => void,
    ) => {
        const annots = await remoteFunction('getAllAnnotationsByUrl')({
            url: fullUrl,
        })
        console.log(`Found ${annots?.length} annots for url`)
        console.dir(annots)
        const highlightables = annots.filter(
            (annotation) => annotation.selector,
        )
        await renderHighlights(highlightables, onAnnotationClick)
    }

    render() {
        return <div>{'hello'}</div>
    }
}

export default Viewer
