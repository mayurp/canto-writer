import type { QuizSummary } from 'hanzi-writer'
import { ReviewRating, type ReviewRating as ReviewRatingType } from './types'
import { PointsSoundVariant } from '../utils/pointsSound'

// ---------------------------------------------------------------------------
// QuizResult — the 6 distinct end-states of a quiz attempt.
// ---------------------------------------------------------------------------

export const QuizResult = {
  GuidedFail: 'GuidedFail',
  GuidedMastered: 'GuidedMastered',
  ReviewAgain: 'ReviewAgain',
  ReviewHard: 'ReviewHard',
  ReviewGood: 'ReviewGood',
  ReviewPerfect: 'ReviewPerfect',
} as const

export type QuizResult = (typeof QuizResult)[keyof typeof QuizResult]

// ---------------------------------------------------------------------------
// Resolve a quiz attempt into a QuizResult
// ---------------------------------------------------------------------------

export const computeQuizResult = (
  isGuidedRun: boolean,
  summary: QuizSummary,
): QuizResult => {
  const mistakes = summary.totalMistakes ?? 0

  if (isGuidedRun) {
    return mistakes === 0 ? QuizResult.GuidedMastered : QuizResult.GuidedFail
  }

  if (mistakes === 0) return QuizResult.ReviewPerfect
  if (mistakes <= 2) return QuizResult.ReviewGood
  if (mistakes <= 4) return QuizResult.ReviewHard
  return QuizResult.ReviewAgain
}

// ---------------------------------------------------------------------------
// QuizResult → SRS grading mappings
// ---------------------------------------------------------------------------

const RESULT_RATING: Record<QuizResult, ReviewRatingType> = {
  // In guided mode, we always want to review the character again
  // regardless of the outcome. We keep track of the learnedOutline field
  // to differntiate between GuidedFail and GuidedMastered.
  [QuizResult.GuidedFail]: ReviewRating.Again,
  [QuizResult.GuidedMastered]: ReviewRating.Again,
  // For unguided (review) mode, we map directly to SRS gradings.
  [QuizResult.ReviewAgain]: ReviewRating.Again,
  [QuizResult.ReviewHard]: ReviewRating.Hard,
  [QuizResult.ReviewGood]: ReviewRating.Good,
  [QuizResult.ReviewPerfect]: ReviewRating.Easy,
}

export const quizResultToSrsRating = (result: QuizResult): ReviewRatingType =>
  RESULT_RATING[result]

export const computeLearnedOutline = (result: QuizResult): boolean =>
  // This is when we consider a character outline to be "learned"
  // In any other case, we want to show the stroke-outline the next
  // time the user practices this character.
  result === QuizResult.GuidedMastered ||
  result === QuizResult.ReviewGood ||
  result === QuizResult.ReviewPerfect

// ---------------------------------------------------------------------------
// QuizResult → points (tweakable independently)
// ---------------------------------------------------------------------------

// NOTE: Base points for any attempt is 10
const RESULT_POINTS: Record<QuizResult, number> = {
  [QuizResult.GuidedFail]: 10,
  [QuizResult.GuidedMastered]: 20,
  [QuizResult.ReviewAgain]: 10,
  [QuizResult.ReviewHard]: 20,
  [QuizResult.ReviewGood]: 30,
  [QuizResult.ReviewPerfect]: 60,
}

export const quizResultToPoints = (result: QuizResult): number =>
  RESULT_POINTS[result]

// ---------------------------------------------------------------------------
// QuizResult → points sound variant
// ---------------------------------------------------------------------------

const RESULT_SOUND: Record<QuizResult, PointsSoundVariant> = {
  [QuizResult.GuidedFail]: PointsSoundVariant.Standard,
  [QuizResult.GuidedMastered]: PointsSoundVariant.Good,
  [QuizResult.ReviewAgain]: PointsSoundVariant.Standard,
  [QuizResult.ReviewHard]: PointsSoundVariant.Good,
  [QuizResult.ReviewGood]: PointsSoundVariant.Great,
  [QuizResult.ReviewPerfect]: PointsSoundVariant.Perfect,
}

export const quizResultToSound = (result: QuizResult): PointsSoundVariant =>
  RESULT_SOUND[result]
