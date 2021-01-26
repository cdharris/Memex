export const getUrl = (url: string) => {
    // Naive detection for now
    if (url.endsWith('.pdf')) {
        return new URL(url).searchParams.get('file')
    }

    return url
}

// TBC
// export const getUriFromDocument(url,documentMetaData)
// export const getUrlFromUri = (uri: string) => {
//    // Will probably want to look up in the database, move this to the appropriate domain model
// }
