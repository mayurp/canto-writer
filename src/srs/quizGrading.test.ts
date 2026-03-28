import { describe, it, expect } from 'vitest'
import {
  computeQuizResult,
  computeLearnedOutline,
  quizResultToSrsRating,
  quizResultToPoints,
  quizResultToSound,
  QuizResult,
} from './quizGrading'
import { ReviewRating } from './types'
import { PointsSoundVariant } from '../utils/pointsSound'

// Minimal QuizSummary shape for tests
const summary = (totalMistakes: number) =>
  ({ totalMistakes }) as Parameters<typeof computeQuizResult>[1]

// ---------------------------------------------------------------------------
// computeQuizResult
// ---------------------------------------------------------------------------

describe('computeQuizResult', () => {
  it('guided + 0 mistakes → GuidedMastered', () => {
    expect(computeQuizResult(true, summary(0))).toBe(QuizResult.GuidedMastered)
  })

  it('guided + mistakes → GuidedFail', () => {
    expect(computeQuizResult(true, summary(3))).toBe(QuizResult.GuidedFail)
  })

  it('free + 0 mistakes → ReviewPerfect', () => {
    expect(computeQuizResult(false, summary(0))).toBe(QuizResult.ReviewPerfect)
  })

  it('free + 1–2 mistakes → ReviewGood', () => {
    expect(computeQuizResult(false, summary(1))).toBe(QuizResult.ReviewGood)
    expect(computeQuizResult(false, summary(2))).toBe(QuizResult.ReviewGood)
  })

  it('free + 3–4 mistakes → ReviewHard', () => {
    expect(computeQuizResult(false, summary(3))).toBe(QuizResult.ReviewHard)
    expect(computeQuizResult(false, summary(4))).toBe(QuizResult.ReviewHard)
  })

  it('free + 5+ mistakes → ReviewAgain', () => {
    expect(computeQuizResult(false, summary(5))).toBe(QuizResult.ReviewAgain)
  })

  it('treats undefined totalMistakes as 0', () => {
    expect(
      computeQuizResult(false, {} as Parameters<typeof computeQuizResult>[1]),
    ).toBe(QuizResult.ReviewPerfect)
  })
})

// ---------------------------------------------------------------------------
// computeLearnedOutline
// ---------------------------------------------------------------------------

describe('computeLearnedOutline', () => {
  it('true for GuidedMastered', () =>
    expect(computeLearnedOutline(QuizResult.GuidedMastered)).toBe(true))
  it('false for GuidedFail', () =>
    expect(computeLearnedOutline(QuizResult.GuidedFail)).toBe(false))
  it('true for ReviewGood', () =>
    expect(computeLearnedOutline(QuizResult.ReviewGood)).toBe(true))
  it('true for ReviewPerfect', () =>
    expect(computeLearnedOutline(QuizResult.ReviewPerfect)).toBe(true))
  it('false for ReviewHard', () =>
    expect(computeLearnedOutline(QuizResult.ReviewHard)).toBe(false))
  it('false for ReviewAgain', () =>
    expect(computeLearnedOutline(QuizResult.ReviewAgain)).toBe(false))
})

// ---------------------------------------------------------------------------
// quizResultToSrsRating
// ---------------------------------------------------------------------------

describe('quizResultToSrsRating', () => {
  it('GuidedFail → Again', () =>
    expect(quizResultToSrsRating(QuizResult.GuidedFail)).toBe(
      ReviewRating.Again,
    ))
  it('GuidedMastered → Again', () =>
    expect(quizResultToSrsRating(QuizResult.GuidedMastered)).toBe(
      ReviewRating.Again,
    ))
  it('ReviewAgain → Again', () =>
    expect(quizResultToSrsRating(QuizResult.ReviewAgain)).toBe(
      ReviewRating.Again,
    ))
  it('ReviewHard → Hard', () =>
    expect(quizResultToSrsRating(QuizResult.ReviewHard)).toBe(
      ReviewRating.Hard,
    ))
  it('ReviewGood → Good', () =>
    expect(quizResultToSrsRating(QuizResult.ReviewGood)).toBe(
      ReviewRating.Good,
    ))
  it('ReviewPerfect → Easy', () =>
    expect(quizResultToSrsRating(QuizResult.ReviewPerfect)).toBe(
      ReviewRating.Easy,
    ))
})

// ---------------------------------------------------------------------------
// quizResultToPoints / quizResultToSound
// ---------------------------------------------------------------------------

describe('result lookups', () => {
  it('GuidedFail → 10 points', () =>
    expect(quizResultToPoints(QuizResult.GuidedFail)).toBe(10))
  it('GuidedMastered → 20 points', () =>
    expect(quizResultToPoints(QuizResult.GuidedMastered)).toBe(20))
  it('ReviewPerfect → 60 points', () =>
    expect(quizResultToPoints(QuizResult.ReviewPerfect)).toBe(60))

  it('ReviewPerfect gets Perfect sound', () =>
    expect(quizResultToSound(QuizResult.ReviewPerfect)).toBe(
      PointsSoundVariant.Perfect,
    ))

  it('ReviewGood gets Great sound', () =>
    expect(quizResultToSound(QuizResult.ReviewGood)).toBe(
      PointsSoundVariant.Great,
    ))

  it('GuidedFail gets Standard sound', () =>
    expect(quizResultToSound(QuizResult.GuidedFail)).toBe(
      PointsSoundVariant.Standard,
    ))
})
