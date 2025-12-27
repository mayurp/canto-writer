import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { ReviewRating } from './types'
import type { SrsAlgorithm } from './SrsDeckManager'
import { SrsCardState } from './SrsDeckManager'

export type CardStats = Card

const ratingMap: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const scheduler = fsrs({
  enable_fuzz: false,
})

const stateMap: Record<State, SrsCardState> = {
  [State.New]: SrsCardState.New,
  [State.Learning]: SrsCardState.Learning,
  [State.Review]: SrsCardState.Review,
  [State.Relearning]: SrsCardState.Relearning,
}

const reviveDate = (value: undefined | null | string | number | Date, fallback: Date): Date => {
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? fallback : parsed
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? fallback : parsed
  }
  return fallback
}

const deserializeCard = (raw: unknown): Card => {
  const base = createEmptyCard()
  if (!raw || typeof raw !== 'object') {
    return base
  }
  const partial = raw as Partial<Card & { learnedOutline?: boolean }>
  const due = reviveDate(partial.due, base.due)
  const lastReview =
    partial.last_review !== undefined && partial.last_review !== null
      ? reviveDate(partial.last_review, base.last_review ?? base.due)
      : undefined
  return {
    ...base,
    ...partial,
    due,
    last_review: lastReview,
  }
}

export const fsrsAlgorithm: SrsAlgorithm<Card> = {
  defaultStats: () => (createEmptyCard()),
  computeNextStats: (stats, rating) => {
    const grade = ratingMap[rating]
    const result = scheduler.next(stats, new Date(), grade)
    return result.card
  },
  deserializeStats: (raw) => deserializeCard(raw),
  getState: (stats) => stateMap[stats.state],
  getDueDate: (stats) => stats.due,
  getStability: (stats) => stats.stability,
}
