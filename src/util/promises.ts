export { resolvablePromise } from './resolvable'
export type { Resolvable } from './resolvable'

export async function sleepPromise(miliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, miliseconds))
}

// Mimics the DartLang `Completer`; a Promise that can be externally resolved
export interface PromiseCompleter<R> {
    promise: Promise<R>
    resolve: (value?: R | PromiseLike<R>) => void
    reject: (error?: any, stackTrace?: string) => void
}
export function promiseCompleter(): PromiseCompleter<any> {
    let resolve
    let reject

    const p = new Promise(function (res, rej) {
        resolve = res
        reject = rej
    })

    return { promise: p, resolve, reject }
}
