import { browser, Extension, Storage, Tabs } from 'webextension-polyfill-ts'
import PDFJS from 'pdfjs-dist'

import normalize from 'src/util/encode-url-for-id'
import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { PDFJS_WORKER_PATH, PDF_VIEWER_URL } from '../constants'
import { Metadata, PDFData } from './types'
import { isUrlToPdf } from '../util'

interface TabArg {
    tab: Tabs.Tab
}

export interface Props {
    storageAPI?: Storage.Static
    extAPI?: Extension.Static
    tabsAPI?: Tabs.Static
    pdfJs?: PDFJS
    pdfJsWorkerPath?: string
    normalizer?: typeof normalize
}

export default class PDFViewerBackground {
    private storageAPI: Storage.Static
    private extAPI: Extension.Static
    private tabsAPI: Tabs.Static
    private pdfJs: PDFJS
    private pdfJsWorkerPath: string
    private urlNormalizer: typeof normalize

    constructor({
        storageAPI = browser.storage,
        extAPI = browser.extension,
        tabsAPI = browser.tabs,
        pdfJs = PDFJS,
        pdfJsWorkerPath = PDFJS_WORKER_PATH,
        normalizer = normalize,
    }: Props) {
        this.storageAPI = storageAPI
        this.extAPI = extAPI
        this.tabsAPI = tabsAPI
        this.pdfJs = pdfJs
        this.pdfJsWorkerPath = pdfJsWorkerPath
        this.urlNormalizer = normalizer

        this.setupPdfJsWorker()
    }

    private setupPdfJsWorker() {
        if (!this.pdfJsWorkerPath) {
            return
        }

        this.pdfJs.workerSrc = this.extAPI.getURL(this.pdfJsWorkerPath)
    }

    setupRemoteFunctions() {
        makeRemotelyCallable(
            {
                getPdfFingerprint: (_, url) =>
                    this.getPdfFingerprintForUrl(url),
                getPdfUrl: (_, print) => this.getPdfUrlForFingerprint(print),
                getPdfData: (_, url) => this.getPdfData(url),
                openPdfViewer: this.openPdfViewer.bind(this),
            },
            { insertExtraArg: true },
        )
    }

    private async fetchPdfFingerprint(url: string) {
        if (!isUrlToPdf(url)) {
            return null
        }

        const pdf = await this.pdfJs.getDocument(url)
        return pdf.fingerprint
    }

    async getPdfUrlForFingerprint(fingerprint: string): Promise<string | null> {
        const storage = await this.storageAPI.local.get(fingerprint)

        if (storage[fingerprint] == null) {
            return null
        }

        return storage[fingerprint]
    }

    async getPdfFingerprintForUrl(url: string): Promise<string> {
        const normalized = this.urlNormalizer(url)
        const storage = await this.storageAPI.local.get(normalized)

        if (storage[normalized] == null) {
            const fingerprint = await this.fetchPdfFingerprint(url)
            await this.storageAPI.local.set({
                [normalized]: fingerprint,
                [fingerprint]: normalized,
            })
            return fingerprint
        }

        return storage[normalized]
    }

    private async getPdfText(pdf, pageDelimiter = ' '): Promise<string> {
        // Read text from pages one by one (in parallel may be too heavy)
        const pageTexts: string[] = []

        for (let i = 1; i <= pdf.pdfInfo.numPages; i++) {
            const page = await pdf.getPage(i)
            // wait for object containing items array with text pieces
            const pageItems = await page.getTextContent()
            const pageText = pageItems.items.map(item => item.str).join(' ')
            pageTexts.push(pageText)
        }

        return pageTexts.join(pageDelimiter)
    }

    private async getPdfMetadata(pdf): Promise<Metadata> {
        const metadata = await pdf.getMetadata()

        return {
            author: metadata.info.Author,
            title: metadata.info.Title,
            keywords: metadata.info.Keywords,
        }
    }

    async getPdfData(url: string): Promise<PDFData> {
        const pdf = await this.pdfJs.getDocument(url)

        const metadata = await this.getPdfMetadata(pdf)
        const text = await this.getPdfText(pdf)

        return { ...metadata, text }
    }

    async openPdfViewer({ tab }: TabArg, url?: string) {
        url = url || tab.url

        if (!url.startsWith('http')) {
            url = `https://${url}`
        }

        return this.tabsAPI.update(tab.id, {
            url: PDF_VIEWER_URL + encodeURI(url),
        })
    }
}
