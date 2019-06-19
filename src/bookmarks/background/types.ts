export interface BookmarkInterface {
    addBookmark: ({ url }: { url: string }) => Promise<any>
    delBookmark: ({ url }: { url: string }) => Promise<any>
}
