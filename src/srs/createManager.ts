import { SrsDeckManager, type ScheduledCard } from './SrsDeckManager'
import { fsrsAlgorithm, type CardStats } from './fsrsAlgorithm'

export type SchedulerStats = CardStats
export type SchedulerCard = ScheduledCard<SchedulerStats>
export type SchedulerManager = SrsDeckManager<SchedulerStats>

export const createSrsManager = () => new SrsDeckManager<SchedulerStats>(fsrsAlgorithm)
