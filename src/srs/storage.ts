import type { SrsCardRecord } from '../models/SrsCard'

export const SRS_STORAGE_KEY = 'canto-writer.deck-state'

export const readStoredState = (): SrsCardRecord[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(SRS_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as SrsCardRecord[]
  } catch {
    return null
  }
}

export const writeStoredState = (cards: SrsCardRecord[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(cards))
  } catch (error) {
    console.warn('Failed to persist SRS deck state', error)
  }
}
