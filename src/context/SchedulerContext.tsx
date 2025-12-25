import { createContext, useContext } from 'react'
import type { ScheduledCard } from '../srs/SrsDeckManager'
import type { CardStats } from '../srs/fsrsAlgorithm'
import type { ReviewRating } from '../srs/types'

export type SchedulerValue = {
  cards: ScheduledCard<CardStats>[]
  currentCard: ScheduledCard<CardStats> | null
  totalCount: number
  dueCount: number
  reviewCard: (cardId: string, rating: ReviewRating) => void
  shouldShowOutline: (cardId: string) => boolean
  setOutlineLearned: (cardId: string, learned: boolean) => void
}

export const SchedulerContext = createContext<SchedulerValue | null>(null)

export const useSchedulerContext = () => {
  const value = useContext(SchedulerContext)
  if (!value) {
    throw new Error('useSchedulerContext must be used within SchedulerProvider')
  }
  return value
}
