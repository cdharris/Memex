abstract class ValueObject<T> {
    _type: string

    constructor(private value: T) {}

    toString = () => this.value
}

class UUID extends ValueObject<string> {
    _type = 'UUID'
}

class FullURL extends ValueObject<string> {
    _type = 'FULL_URL'
}

interface NormalisedUrl extends ValueObject<string> {
    _type: 'NORMALISED_URL'
}

interface Fingerprint {
    value: string
    scheme: 'pdf-v1'
}

interface MetadataQuery {
    normalisedUrl?: NormalisedUrl
    url?: FullURL
    Fingerprint?: Fingerprint
}

// Treat these two as seperate even if they are in the same Pages table for now
// build ahead to if the fulltext and metadata are stored seperately.
interface ContentFulltext {
    contentId: UUID
    contentLocationId: UUID
    fulltext: string
}

interface ContentMetadata {}

interface ContentLocator {
    id: string
    contentID: string
    fingerprint: string
}

type Content = ContentFulltext & ContentMetadata

interface ContentMetadataQuery {}
