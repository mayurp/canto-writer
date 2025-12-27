import type { FlashcardDefinition } from '../data/cards'
import { SrsDeckManager, type ScheduledCard } from './SrsDeckManager'
import { fsrsAlgorithm, type CardStats } from './fsrsAlgorithm'
import type { SrsCardRecord } from '../models/SrsCard'

export type SchedulerStats = CardStats
export type SchedulerCard = ScheduledCard<SchedulerStats>
export type SchedulerManager = SrsDeckManager<SchedulerStats>

export const createSrsManager = (
  definitions: FlashcardDefinition[],
  storedCards?: SrsCardRecord[],
) => new SrsDeckManager<SchedulerStats>(definitions, fsrsAlgorithm, storedCards)
