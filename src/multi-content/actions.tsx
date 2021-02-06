//
//
// Content({url}).bookmark()
//
//
// MemexStorage.bookmark(ContentMetadata({url}))
//
// MemexApiV1.indexed({url}).bookmark(true)
// MemexApiV1.indexed({fingerprint}).bookmark(true)
// MemexApiV1.indexed({url}).collectionsAdd([id])
// MemexApiV1.indexed({url}).annotationsAdd([annotation])
// MemexApiV1.indexed({url}).annotationsShare([annotation])
// MemexAPIV1.indexed({normalisedUrl}).annotations.getAll()
// MemexAPIV1.indexed({normalisedUrl}).annotations.getIterator()
// MemexAPIV1.indexed({normalisedUrl}).metadata
// MemexAPIV1.indexed({normalisedUrl}).fulltext
// MemexAPIV1.indexed({uuid}).fulltext
//
// // public api will have to under the hood, handle doing and sending indexing to the server
// // and debouncing/aggregating futher operations
// MemexPublicAPIV1.collectionsAdd({url},[id])
//
// MemexAPIV1.indexed({normalisedUrl}).annotations.getAll()
// MemexAPIV1.indexed({normalisedUrl}).annotations.getIterator()
// MemexAPIV1.indexed({normalisedUrl}).metadata
// MemexAPIV1.indexed({normalisedUrl}).fulltext
//
// // export sugar
// // const m = (id: MetadataLocator) => MemexAPIV1.indexed(id).op
// // m({url}).bookmark()
//
// //
// // index(local file url)
//
// interface ValueObject<T>
//     extends Readonly<{
//         type: string;
//         value: T;
//     }> {}
// interface NormalisedUrl extends ValueObject<string> {
//     type: "NORMALISED_URL";
// }
//
// function asNormURL(value: string): NormalisedUrl {
//     // Validation, e.g. does not start with http
//     return { type: "NORMALISED_URL", value };
// }
// interface FullUrl extends ValueObject<string> {
//     type: "FULL_URL";
// }
//
// function asFullURL(value: string): FullUrl {
//     // Validation, e.g. does must start with http or file
//     return { type: "FULL_URL", value };
// }
// function normaliseURL(url) {
//     // normalisation logic
//     return asNormURL(url)
// }
//
// interface Fingerprint {
//     value: string
//     scheme: "pdf-v1"
// }
//
// interface MetadataQuery {
//     normalisedUrl?: NormalisedUrl
//     url?: FullUrl
//     Fingerprint?: Fingerprint
// }
// class ContentMetadata {
//
// }
// class MetadataLocator {
//     constructor(storageLayer) {
//     }
//
//     fetchMetadata(query: MetadataQuery) {
//         return new ContentMetadata()
//     }
// }
//
//
// class StorageLayer {
//
//     bookmark({id, value}) {
//
//     }
//
//
//     getMetadataForId({id}) {
//         return {}
//     }
//     getLocatorsForId({id}) {
//         return {}
//     }
//     getMetadataForQuery(q: MetadataQuery) {
//         return {}
//     }
//
//
//     index({fulltext,metadata}) {
//
//     }
// }
//
// class MemexAPIV1 {
//
//     private storageLayer
//     private metadataLocator
//
//     constructor(storageLayer: StorageLayer) {
//         this.storageLayer = storageLayer
//         this.metadataLocator = new MetadataLocator(this.storageLayer)
//     }
//
//     // Return Metadata that has already, or will be, indexed with Memex
//     indexed = (query: MetadataQuery) => {
//         // may need to return a prxoy itself?
//        return new MetadataOperator(
//             new IndexContentMetadataFacade(
//                 this.metadataLocator.fetchMetadata,
//                 this.storageLayer,
//                 query,
//             ),
//             this.storageLayer,
//             this.contentLocator,
//         )
//
//     }
// }
//
// class MetadataOperator {
//
//     private readonly op
//
//     constructor(private readonly metadata, private readonly storage, private readonly contentLocator) {
//         this.op = new Proxy(metadata,this)
//     }
//
//     get = (target, p, receiver) => {
//         if (!metadata.indexed) {
//             this.contentLocator.getMetadata(metadata.)
//             this.storage.index(metadata)
//         }
//         ({args}) => this.storage[p](metadata.id,args)
//     }
//
// }
//
// class IndexContentMetadataFacade {
//
//     constructor(private readonly fetchMetadata, private readonly storageLayer, private query) {}
//     private _metadata
//
//     getMetadata() {
//         return new Promise(resolve => resolve(this._metadata))
//             ?? (this._metadata = await this.fetchMetadata(this.query))
//     }
//
//     get exists() {
//         return true
//     }
//
//
// }
//
// // this means we can swap this out or add middlewares etc
// class StorageOperator {
//
//     constructor(metadata, storagelayer) {
//     }
//
//
//     call = () => {
//         ifIndexed
//
//         // get full text
//
//
//     }
//     storageLayer.content.addContent
//
//
//     storageLayer.collections.addContent({contentId, collectionId})
//
// }
//
// i({url}).tags({add:[], remove:[], new: []})
//
