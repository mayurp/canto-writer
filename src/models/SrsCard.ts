export interface SrsCard {
  // Algorithm-specific srs stats
  stats: unknown
  // Custom metadata
  learnedOutline: boolean
}

export interface SrsCardRecord extends SrsCard {
  id: string     // Globally unique id (requird by dexie-cloud)
  cardId: string // FlashcardDefinition id
}

export type SerializedSrsDeck = SrsCardRecord[]
