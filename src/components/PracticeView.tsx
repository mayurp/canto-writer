import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QuizSummary } from 'hanzi-writer'
import { ReviewRating, type ReviewRating as ReviewRatingType, type GradingInfo } from '../srs/types'
import { StrokeAnimator } from './StrokeAnimator'
import { useSettingsContext } from '../context/SettingsContext'
import { useSchedulerContext } from '../context/SchedulerContext'
import { useVocabExamples } from '../hooks/useVocabExamples'
import { buildPronunciationUtterance } from '../utils/pronunciation'

const ratingLabels: Record<ReviewRatingType, string> = {
  [ReviewRating.Again]: 'Again',
  [ReviewRating.Hard]: 'Hard',
  [ReviewRating.Good]: 'Good',
  [ReviewRating.Easy]: 'Easy',
}

const ratingFromMistakes = (summary: QuizSummary, guidedRun: boolean): ReviewRatingType => {
  if (guidedRun) return ReviewRating.Again
  const count = summary.totalMistakes ?? 0
  if (count === 0) return ReviewRating.Easy
  if (count <= 2) return ReviewRating.Good
  if (count <= 4) return ReviewRating.Hard
  return ReviewRating.Again
}

const MIN_WRITER_SIZE = 220
const MAX_WRITER_SIZE = 520
const VERTICAL_RESERVE = 360
const PRONUNCIATION_DELAY_MS = 500

const getResponsiveWriterSize = () => {
  if (typeof window === 'undefined') return MIN_WRITER_SIZE
  const widthLimit = window.innerWidth * 0.65
  const heightLimit = Math.max(MIN_WRITER_SIZE, window.innerHeight - VERTICAL_RESERVE)
  const target = Math.min(widthLimit, heightLimit, MAX_WRITER_SIZE)
  return Math.max(MIN_WRITER_SIZE, target)
}

type PracticeViewProps = {
  playPronunciation: (text: string, options?: { rate?: number }) => void
  speaking: boolean
  isSupported: boolean
  voiceRate: number
}

export function PracticeView({ playPronunciation, speaking, isSupported, voiceRate }: PracticeViewProps) {
  const { currentCard, gradeCard, shouldShowOutline } = useSchedulerContext()
  const { settings } = useSettingsContext()
  const { examples } = useVocabExamples()
  const [writerSize, setWriterSize] = useState(() => getResponsiveWriterSize())
  const [strokeSession, setStrokeSession] = useState(0)
  const [cardCompleted, setCardCompleted] = useState(false)
  const [pendingGrading, setPendingGrading] = useState<GradingInfo | null>(null)
  const [showStrokeOutline, setShowStrokeOutline] = useState(false)
  const currentCardId = currentCard?.id ?? null

  useEffect(() => {
    const handleResize = () => setWriterSize(getResponsiveWriterSize())
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCardCompleted(false)
    setPendingGrading(null)
    setStrokeSession(0)
    if (currentCardId) {
      setShowStrokeOutline(shouldShowOutline(currentCardId))
    }
  }, [currentCardId, shouldShowOutline])

  const currentCharacter = currentCard?.character

  useEffect(() => {
    if (!isSupported || !currentCharacter) return
    const timer = window.setTimeout(() => {
      playPronunciation(buildPronunciationUtterance(currentCharacter, examples), { rate: voiceRate })
    }, PRONUNCIATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleCardPronunciation = useCallback(() => {
    if (!isSupported || !currentCharacter) return
    playPronunciation(buildPronunciationUtterance(currentCharacter, examples), { rate: voiceRate })
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleQuizComplete = useCallback(
    (summary: QuizSummary) => {
      const guidedRun = showStrokeOutline
      const rating = ratingFromMistakes(summary, guidedRun)
      const learnedOutline =
        guidedRun ? (summary.totalMistakes ?? 0) === 0 : rating === ReviewRating.Good || rating === ReviewRating.Easy

      setCardCompleted(true)
      setPendingGrading({ rating, learnedOutline })
    },
    [showStrokeOutline],
  )

  const handleRating = useCallback(
    (rating: ReviewRatingType) => {
      if (!currentCard) return
      setPendingGrading((prev) => ({
        rating,
        learnedOutline: prev?.learnedOutline ?? currentCard.learnedOutline,
      }))
      setCardCompleted(true)
    },
    [currentCard?.learnedOutline],
  )

  const handleStrokeReset = useCallback(() => {
    setStrokeSession((prev) => prev + 1)
    setCardCompleted(false)
    setPendingGrading(null)
  }, [])

  const handleNextCard = useCallback(() => {
    if (!pendingGrading || !currentCardId) return
    gradeCard(currentCardId, pendingGrading)
    setPendingGrading(null)
    setCardCompleted(false)
  }, [currentCardId, gradeCard, pendingGrading])

  const displayOrder = useMemo(() => {
    if (!currentCard) return null
    if (settings.orderMode === 'rth') {
      return currentCard.rthOrder ?? currentCard.order
    }
    return currentCard.order
  }, [currentCard, settings.orderMode])

  if (!currentCard) {
    return null
  }

  const orderLabel = settings.orderMode === 'rth' ? 'RTH frame' : 'Opt frame'

  return (
    <section className="card-stage">
      <div className="study-card">
        <div className="card-top">
          <div className="card-info">
            <div className="card-character" aria-label="Keyword meaning">
              {currentCard.meaning}
            </div>
            <p className="card-order">
              {orderLabel} #{displayOrder}
            </p>
          </div>
          <button
            type="button"
            className="audio-button"
            onClick={handleCardPronunciation}
            disabled={!isSupported}
            aria-label={speaking ? 'Playing pronunciation' : 'Play Cantonese audio'}
          >
            <svg className="audio-glyph" viewBox="0 0 64 64" role="presentation" aria-hidden="true">
              <path
                d="M16 28h10l12-10v28l-12-10H16z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M44 22c4 4 4 16 0 20m8-26c6 8 6 24 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={speaking ? 1 : 0.6}
              />
            </svg>
          </button>
        </div>

        <div className="stroke-wrapper">
          <div className="stroke-header">
            <button type="button" className="clear-button" onClick={handleStrokeReset} aria-label="Clear strokes">
              Clear
            </button>
          </div>
          <StrokeAnimator
            character={currentCard.character}
            size={writerSize}
            sessionKey={strokeSession}
            showOutline={showStrokeOutline}
            onQuizComplete={handleQuizComplete}
          />
        </div>

        <div className="card-actions">
          <div className="next-button-container">
            <button
              type="button"
              className="next-button"
              disabled={!cardCompleted || !pendingGrading?.rating}
              onClick={handleNextCard}
            >
              Next
            </button>
          </div>
          {settings.debug && (
            <div className="grading-buttons">
              {(Object.keys(ratingLabels) as ReviewRatingType[]).map((rating) => (
                <button
                  key={rating}
                  className={`grade-button grade-${rating}`}
                  onClick={() => handleRating(rating)}
                >
                  {ratingLabels[rating]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
