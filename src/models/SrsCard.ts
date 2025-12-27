export interface SrsCard {
  // Algorithm-specific srs stats
  stats: unknown
  // Custom metadata
  learnedOutline: boolean
}

export interface SrsCardRecord extends SrsCard {
  id: string
}

export type SerializedSrsDeck = SrsCardRecord[]
