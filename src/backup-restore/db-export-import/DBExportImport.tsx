import React, { Component } from 'react'
import Dexie from 'dexie'
import { exportDB } from 'dexie-export-import'
import { ExportProgress } from 'dexie-export-import/dist/export'

async function exportDatabase(databaseName, progressCallback) {
    const db = await new Dexie(databaseName).open()
    // @ts-ignore
    const blob = await exportDB(db, { progressCallback, noTransaction: true })
    return blob
}

async function getFile() {
    // @ts-ignore
    const handle = await window.showDirectoryPicker()
    const perms = await handle.requestPermission({ writable: true })
    console.log({ perms })
    console.log(handle)
    const newFile = await handle.getFileHandle('memex-backup2', {
        create: true,
    })
    return newFile
}

async function writeFile(fileHandle, contents: Blob) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable()
    // Write the contents of the file to the stream.
    // await writable.write(contents);
    await contents.stream().pipeTo(writable)
    // Close the file and write the contents to disk.
    await writable.close()
}

class DBExportImport extends Component {
    backup = async () => {
        const file = await getFile()

        const progress = (progress: ExportProgress) => {
            console.log(progress)
            if (progress.done) {
                console.log('done!')
            }
        }
        console.time('Export')
        const exp = await exportDatabase('memex', progress)
        console.log('got exp', { exp })

        await writeFile(file, exp)
        console.timeEnd('Export')
        console.log('Wrote file')
        // write to file blob
    }

    render() {
        return (
            <div>
                <button name={'backup'} onClick={this.backup} />
            </div>
        )
    }
}

export default DBExportImport
