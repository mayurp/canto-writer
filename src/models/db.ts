import { Dexie } from 'dexie'
import dexieCloud, { type DexieCloudTable } from 'dexie-cloud-addon'
import type { SettingsRecord } from './Settings'
import type { DeckSelectionRecord } from './DeckSelection'
import type { SrsCardRecord } from './SrsCard'
import type { UserStatsRecord } from './UserStats'

export default class CantoWriterDB extends Dexie {
  settings!: DexieCloudTable<SettingsRecord, 'id'>
  deckSelections!: DexieCloudTable<DeckSelectionRecord, 'id'>
  srsCards!: DexieCloudTable<SrsCardRecord, 'id'>
  userStats!: DexieCloudTable<UserStatsRecord, 'id'>

  constructor() {
    super('CantoWriterDB', { addons: [dexieCloud] })

    this.version(1).stores({
      settings: 'id',
      deckSelections: 'id',
      srsCards: 'id, cardId',
    })

    this.version(2).stores({
      settings: 'id',
      deckSelections: 'id',
      srsCards: 'id, cardId',
      userStats: 'id',
    })

    this.cloud.configure({
      databaseUrl: 'https://zfmwg6jca.dexie.cloud',
    })
  }
}

export const db = new CantoWriterDB()
