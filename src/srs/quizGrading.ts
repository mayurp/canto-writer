import type { QuizSummary } from 'hanzi-writer'
import { ReviewRating, type ReviewRating as ReviewRatingType } from './types'
import { PointsSoundVariant } from '../utils/pointsSound'

export const POINTS_BASE = 10
export const POINTS_GUIDED_BONUS = 10
export const POINTS_RATING_BONUS: Record<ReviewRatingType, number> = {
  [ReviewRating.Again]: 0,
  [ReviewRating.Hard]: 10,
  [ReviewRating.Good]: 20,
  [ReviewRating.Easy]: 50,
}

export const ratingFromMistakes = (
  summary: QuizSummary,
  isGuidedRun: boolean,
): ReviewRatingType => {
  if (isGuidedRun) return ReviewRating.Again
  const count = summary.totalMistakes ?? 0
  if (count === 0) return ReviewRating.Easy
  if (count <= 2) return ReviewRating.Good
  if (count <= 4) return ReviewRating.Hard
  return ReviewRating.Again
}

export const computeLearnedOutline = (
  isGuidedRun: boolean,
  summary: QuizSummary,
  rating: ReviewRatingType,
): boolean => {
  if (isGuidedRun) return (summary.totalMistakes ?? 0) === 0
  return rating === ReviewRating.Good || rating === ReviewRating.Easy
}

export const computePoints = (input: {
  guidedMode: boolean
  learnedOutline: boolean
  rating: ReviewRatingType
}): number => {
  let points = POINTS_BASE
  if (input.guidedMode) {
    if (input.learnedOutline) points += POINTS_GUIDED_BONUS
  } else {
    points += POINTS_RATING_BONUS[input.rating]
  }
  return points
}

export const getSoundVariant = (points: number): PointsSoundVariant => {
  if (points >= 35) return PointsSoundVariant.Perfect
  if (points >= 30) return PointsSoundVariant.Great
  if (points >= 20) return PointsSoundVariant.Good
  return PointsSoundVariant.Standard
}
