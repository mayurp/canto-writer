export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export const SrsCardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const

export type SrsCardState = (typeof SrsCardState)[keyof typeof SrsCardState]
