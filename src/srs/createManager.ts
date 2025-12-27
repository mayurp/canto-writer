import { useRef } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import { SrsDeckManager } from './SrsDeckManager'
import { fsrsAlgorithm, type CardStats } from './fsrsAlgorithm'
import { readStoredState } from './storage'

export const createSrsManager = (definitions: FlashcardDefinition[]) => {
  const stored = readStoredState()
  return new SrsDeckManager<CardStats>(definitions, fsrsAlgorithm, stored ?? undefined)
}

export const createSrsManagerUseRef = (definitions: FlashcardDefinition[]) =>
  useRef<SrsDeckManager<CardStats>>(createSrsManager(definitions))
