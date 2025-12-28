export const ReviewRating = {
  Again: 'again',
  Hard: 'hard',
  Good: 'good',
  Easy: 'easy',
} as const

export type ReviewRating = (typeof ReviewRating)[keyof typeof ReviewRating]

export type GradingInfo = {
  rating: ReviewRating
  learnedOutline: boolean
}

export const SrsCardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const

export type SrsCardState = (typeof SrsCardState)[keyof typeof SrsCardState]
