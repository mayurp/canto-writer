import { describe, it, expect } from 'vitest'
import {
  ratingFromMistakes,
  computeLearnedOutline,
  computePoints,
  getSoundVariant,
  POINTS_BASE,
  POINTS_GUIDED_BONUS,
  POINTS_RATING_BONUS,
} from './quizGrading'
import { ReviewRating } from './types'
import { PointsSoundVariant } from '../utils/pointsSound'

// Minimal QuizSummary shape for tests
const summary = (totalMistakes: number) =>
  ({ totalMistakes }) as Parameters<typeof ratingFromMistakes>[0]

// ---------------------------------------------------------------------------
// ratingFromMistakes
// ---------------------------------------------------------------------------

describe('ratingFromMistakes', () => {
  it('returns Again for any guided run', () => {
    expect(ratingFromMistakes(summary(0), true)).toBe(ReviewRating.Again)
    expect(ratingFromMistakes(summary(5), true)).toBe(ReviewRating.Again)
  })

  it('returns Easy for 0 mistakes in free-writing', () => {
    expect(ratingFromMistakes(summary(0), false)).toBe(ReviewRating.Easy)
  })

  it('returns Good for 1–2 mistakes', () => {
    expect(ratingFromMistakes(summary(1), false)).toBe(ReviewRating.Good)
    expect(ratingFromMistakes(summary(2), false)).toBe(ReviewRating.Good)
  })

  it('returns Hard for 3–4 mistakes', () => {
    expect(ratingFromMistakes(summary(3), false)).toBe(ReviewRating.Hard)
    expect(ratingFromMistakes(summary(4), false)).toBe(ReviewRating.Hard)
  })

  it('returns Again for 5+ mistakes', () => {
    expect(ratingFromMistakes(summary(5), false)).toBe(ReviewRating.Again)
  })

  it('treats undefined totalMistakes as 0', () => {
    expect(
      ratingFromMistakes({} as Parameters<typeof ratingFromMistakes>[0], false),
    ).toBe(ReviewRating.Easy)
  })
})

// ---------------------------------------------------------------------------
// computeLearnedOutline
// ---------------------------------------------------------------------------

describe('computeLearnedOutline', () => {
  it('guided run: true when 0 mistakes', () => {
    expect(computeLearnedOutline(true, summary(0), ReviewRating.Again)).toBe(
      true,
    )
  })

  it('guided run: false when mistakes > 0', () => {
    expect(computeLearnedOutline(true, summary(1), ReviewRating.Again)).toBe(
      false,
    )
  })

  it('free run: true for Good', () => {
    expect(computeLearnedOutline(false, summary(1), ReviewRating.Good)).toBe(
      true,
    )
  })

  it('free run: true for Easy', () => {
    expect(computeLearnedOutline(false, summary(0), ReviewRating.Easy)).toBe(
      true,
    )
  })

  it('free run: false for Hard', () => {
    expect(computeLearnedOutline(false, summary(3), ReviewRating.Hard)).toBe(
      false,
    )
  })

  it('free run: false for Again', () => {
    expect(computeLearnedOutline(false, summary(5), ReviewRating.Again)).toBe(
      false,
    )
  })
})

// ---------------------------------------------------------------------------
// computePoints
// ---------------------------------------------------------------------------

describe('computePoints', () => {
  it('guided + learned outline = base + bonus', () => {
    expect(
      computePoints({
        guidedMode: true,
        learnedOutline: true,
        rating: ReviewRating.Again,
      }),
    ).toBe(POINTS_BASE + POINTS_GUIDED_BONUS)
  })

  it('guided + not learned = base only', () => {
    expect(
      computePoints({
        guidedMode: true,
        learnedOutline: false,
        rating: ReviewRating.Again,
      }),
    ).toBe(POINTS_BASE)
  })

  it('free + Easy = base + Easy bonus', () => {
    expect(
      computePoints({
        guidedMode: false,
        learnedOutline: true,
        rating: ReviewRating.Easy,
      }),
    ).toBe(POINTS_BASE + POINTS_RATING_BONUS[ReviewRating.Easy])
  })

  it('free + Again = base only', () => {
    expect(
      computePoints({
        guidedMode: false,
        learnedOutline: false,
        rating: ReviewRating.Again,
      }),
    ).toBe(POINTS_BASE)
  })
})

// ---------------------------------------------------------------------------
// getSoundVariant
// ---------------------------------------------------------------------------

describe('getSoundVariant', () => {
  it('>=35 → Perfect', () =>
    expect(getSoundVariant(35)).toBe(PointsSoundVariant.Perfect))
  it('30-34 → Great', () =>
    expect(getSoundVariant(30)).toBe(PointsSoundVariant.Great))
  it('20-29 → Good', () =>
    expect(getSoundVariant(20)).toBe(PointsSoundVariant.Good))
  it('<20 → Standard', () =>
    expect(getSoundVariant(10)).toBe(PointsSoundVariant.Standard))
})
