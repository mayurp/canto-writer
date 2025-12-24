import { Dexie } from 'dexie'
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon"
import type { SettingsRecord } from './settings'

export default class CantoWriterDB extends Dexie {
  settings!: DexieCloudTable<SettingsRecord, 'key'>

  constructor() {
    super('CantoWriterDB', { addons: [dexieCloud] })

    this.version(1).stores({
      settings: '&key',
    })

    this.cloud.configure({
      databaseUrl: 'https://zz9nag7uv.dexie.cloud',
    })
  }
}

export const db = new CantoWriterDB()
