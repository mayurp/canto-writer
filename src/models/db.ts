import { Dexie } from 'dexie'
import dexieCloud, { type DexieCloudTable } from 'dexie-cloud-addon'
import type { SettingsRecord } from './Settings'
import type { DeckSelectionRecord } from './DeckSelection'
import type { SrsCardRecord } from './SrsCard'

export default class CantoWriterDB extends Dexie {
  settings!: DexieCloudTable<SettingsRecord, 'key'>
  deckSelections!: DexieCloudTable<DeckSelectionRecord, 'key'>
  srsCards!: DexieCloudTable<SrsCardRecord, 'id'>

  constructor() {
    super('CantoWriterDB', { addons: [dexieCloud] })

    this.version(1).stores({
      settings: '&key',
      deckSelections: '&key',
    })

    this.version(2).stores({
      settings: '&key',
      deckSelections: '&key',
      srsCards: '&id',
    })

    this.cloud.configure({
      databaseUrl: 'https://zbwpeyv2x.dexie.cloud',
    })
  }
}

export const db = new CantoWriterDB()
