import { Dexie } from 'dexie'
import dexieCloud, { type DexieCloudTable } from "dexie-cloud-addon"
import type { SettingsRecord } from './Settings'
import type { DeckSelectionRecord } from './DeckSelection'

export default class CantoWriterDB extends Dexie {
  settings!: DexieCloudTable<SettingsRecord, 'key'>
  deckSelections!: DexieCloudTable<DeckSelectionRecord, 'key'>

  constructor() {
    super('CantoWriterDB', { addons: [dexieCloud] })

    this.version(1).stores({
      settings: '&key',
      deckSelections: '&key',
    })

    this.cloud.configure({
      databaseUrl: 'https://zbwpeyv2x.dexie.cloud',
    })
  }
}

export const db = new CantoWriterDB()
