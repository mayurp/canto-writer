import { useRef } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import { SrsDeckManager, type ScheduledCard } from './SrsDeckManager'
import { fsrsAlgorithm, type CardStats } from './fsrsAlgorithm'
import { readStoredState } from './storage'

export type SchedulerStats = CardStats
export type SchedulerCard = ScheduledCard<SchedulerStats>
export type SchedulerManager = SrsDeckManager<SchedulerStats>

export const createSrsManager = (definitions: FlashcardDefinition[]) => {
  const stored = readStoredState()
  return new SrsDeckManager<SchedulerStats>(definitions, fsrsAlgorithm, stored ?? undefined)
}

export const createSrsManagerUseRef = (definitions: FlashcardDefinition[]) =>
  useRef<SchedulerManager>(createSrsManager(definitions))
