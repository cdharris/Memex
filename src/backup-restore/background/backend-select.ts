import * as driveBackup from './backend/google-drive'
import * as localBackup from './backend/simple-http'
import * as filesytemBackup from './backend/filesystem'
import * as backup from '.'
import { browser } from 'webextension-polyfill-ts'
import { BackupBackend } from './backend/types'

export class BackendSelect {
    async restoreBackend(): Promise<BackupBackend> {
        const backendLocation = await this.restoreBackendLocation()
        if (backendLocation === 'local') {
            this.saveBackendLocation('local')
            return this.initLocalBackend()
        } else if (backendLocation === 'google-drive') {
            this.saveBackendLocation('google-drive')
            return this.initGDriveBackend()
        } else if (backendLocation === 'filesystem') {
            this.saveBackendLocation('filesystem')
            return this.initFilesystemBackend()
        } else {
            return undefined
        }
    }

    async initGDriveBackend(): Promise<BackupBackend> {
        return new driveBackup.DriveBackupBackend({
            tokenStore: new driveBackup.LocalStorageDriveTokenStore({
                prefix: 'drive-token-',
            }),
            memexCloudOrigin: backup._getMemexCloudOrigin(),
        })
    }

    async initLocalBackend(): Promise<BackupBackend> {
        return new localBackup.MemexLocalBackend({
            url: 'http://localhost:11922',
        })
    }
    async initFilesystemBackend(): Promise<BackupBackend> {
        const backupLocation = await browser.storage.local.get('backupLocation')

        return new filesytemBackup.FilesystemBackend({
            handle: backupLocation.handle,
        })
    }

    async restoreBackendLocation(): Promise<string> {
        const storageObject = await browser.storage.local.get('backendInfo')
        if (storageObject.backendInfo) {
            const backendLocation = storageObject.backendInfo.location
            return backendLocation
        } else {
            return undefined
        }
    }

    async saveBackendLocation(location: string): Promise<void> {
        console.log('saveBackendLocation')
        const response = await browser.storage.local.set({
            backendInfo: { location },
        })
        return response
    }
    async saveBackendHandle(handle: any): Promise<void> {
        console.log('saveBackendHandle')
        console.log(handle)
        const response = await browser.storage.local.set({
            backendLocation: { handle },
        })
        return response
    }
}
