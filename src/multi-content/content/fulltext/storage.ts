import {
    StorageModule,
    StorageModuleConfig,
    StorageModuleConstructorArgs,
} from '@worldbrain/storex-pattern-modules'
import { PipelineRes, VisitInteraction } from 'src/search'
import { initErrHandler } from 'src/search/storage'
import { getTermsField } from '@worldbrain/memex-common/lib/storage/utils'
import { mergeTermFields } from '@worldbrain/memex-common/lib/page-indexing/utils'
import decodeBlob from 'src/util/decode-blob'
import { pageIsStub } from 'src/page-indexing/utils'

import { StorageModuleCollections } from '@worldbrain/storex-pattern-modules'

export const CONTENT_FULLTEXT_NAMES = {
    contentFulltext: 'ContentFulltext',
}

export const CONTENT_FULLTEXT_DEFINITIONS: StorageModuleCollections = {
    [CONTENT_FULLTEXT_NAMES.contentFulltext]: {
        version: new Date('2021-02-06'),
        fields: {
            contentID: { type: 'string' },
            contentVersionID: { type: 'string' },
            text: { type: 'text', optional: true },
        },
        indices: [
            { field: 'contentID' },
            { field: 'contentVersionID', pk: true },
            { field: 'text', fullTextIndexName: 'terms' }, // TODO: Multi-Content are these seperate names (text/terms) correct?
        ],
    },
}

export default class ContentFulltextStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            ...CONTENT_FULLTEXT_DEFINITIONS,
        },
        operations: {
            create: {
                operation: 'createObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
            },
            update: {
                operation: 'updateObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
                args: [
                    { contentVersionID: '$contentVersionID:string' },
                    '$updates',
                ],
            },
            delete: {
                operation: 'deleteObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
                args: {
                    contentVersionID: 'contentVersionID:string',
                },
            },
            find: {
                operation: 'findObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
                args: {
                    contentID: '$contentID:string',
                    contentVersionID: '$contentVersionID:string',
                },
            },
            searchByContentID: {
                operation: 'findObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
                args: {
                    contentID: '$contentID:string',
                },
            },
            countContentID: {
                operation: 'countObject',
                collection: CONTENT_FULLTEXT_NAMES.contentFulltext,
                args: {
                    contentID: '$contentID:string',
                    contentVersionID: '$contentVersionID:string',
                },
            },
        },
    })

    async create(data: ContentFulltext) {
        await this.operation('create', data)
    }

    async pageExists(contentVersionID: string): Promise<boolean> {
        const count = await this.operation('count', { contentVersionID })
        return count > 0
    }

    async find(contentID: string, locationID): Promise<ContentFulltext> {
        return this.operation('find', { contentID, locationID })
    }
}
