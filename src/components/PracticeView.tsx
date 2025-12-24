import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QuizSummary } from 'hanzi-writer'
import type { ReviewRating } from '../srs/types'
import type { ScheduledCard } from '../srs/SrsDeckManager'
import type { CardStats } from '../srs/fsrsAlgorithm'
import { StrokeAnimator } from './StrokeAnimator'
import { useSettings } from '../hooks/useSettings'

const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

const ratingFromMistakes = (summary: QuizSummary, guidedRun: boolean): ReviewRating => {
  if (guidedRun) return 'again'
  const count = summary.totalMistakes ?? 0
  if (count === 0) return 'easy'
  if (count <= 2) return 'good'
  if (count <= 4) return 'hard'
  return 'again'
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

const buildPronunciationUtterance = (character: string, examples: Record<string, string[]>) => {
  const exampleClue = examples[character]?.[0]
  return exampleClue ? `${character}，${exampleClue}嘅${character}` : character
}

type PracticeViewProps = {
  currentCard: ScheduledCard<CardStats>
  reviewCard: (cardId: string, rating: ReviewRating) => void
  shouldShowOutline: (cardId: string) => boolean
  setOutlineLearned: (cardId: string, learned: boolean) => void
  examples: Record<string, string[]>
  playPronunciation: (text: string, options?: { rate?: number }) => void
  speaking: boolean
  isSupported: boolean
  voiceRate: number
}

export function PracticeView({
  currentCard,
  reviewCard,
  shouldShowOutline,
  setOutlineLearned,
  examples,
  playPronunciation,
  speaking,
  isSupported,
  voiceRate,
}: PracticeViewProps) {
  const { settings } = useSettings()
  const [writerSize, setWriterSize] = useState(() => getResponsiveWriterSize())
  const [strokeSession, setStrokeSession] = useState(0)
  const [cardCompleted, setCardCompleted] = useState(false)
  const [pendingRating, setPendingRating] = useState<ReviewRating | null>(null)
  const [showStrokeOutline, setShowStrokeOutline] = useState(() => shouldShowOutline(currentCard.id))
  const currentCardId = currentCard.id

  useEffect(() => {
    const handleResize = () => setWriterSize(getResponsiveWriterSize())
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCardCompleted(false)
    setPendingRating(null)
    setStrokeSession(0)
    setShowStrokeOutline(shouldShowOutline(currentCardId))
  }, [currentCardId, shouldShowOutline])

  const currentCharacter = currentCard.character

  useEffect(() => {
    if (!isSupported) return
    const timer = window.setTimeout(() => {
      playPronunciation(buildPronunciationUtterance(currentCharacter, examples), { rate: voiceRate })
    }, PRONUNCIATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleCardPronunciation = useCallback(() => {
    if (!isSupported) return
    playPronunciation(buildPronunciationUtterance(currentCharacter, examples), { rate: voiceRate })
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleQuizComplete = useCallback(
    (summary: QuizSummary) => {
      const guidedRun = showStrokeOutline
      const rating = ratingFromMistakes(summary, guidedRun)
      const outlineLearned = guidedRun ? (summary.totalMistakes ?? 0) === 0 : rating === 'easy' || rating === 'good'

      setOutlineLearned(currentCardId, outlineLearned)
      setCardCompleted(true)
      setPendingRating(rating)
    },
    [currentCardId, setOutlineLearned, showStrokeOutline],
  )

  const handleRating = useCallback((rating: ReviewRating) => {
    setPendingRating(rating)
    setCardCompleted(true)
  }, [])

  const handleStrokeReset = useCallback(() => {
    setStrokeSession((prev) => prev + 1)
    setCardCompleted(false)
    setPendingRating(null)
  }, [])

  const handleNextCard = useCallback(() => {
    if (!pendingRating) return
    reviewCard(currentCardId, pendingRating)
    setPendingRating(null)
    setCardCompleted(false)
  }, [currentCardId, pendingRating, reviewCard])

  const displayOrder = useMemo(() => {
    if (settings.orderMode === 'rth') {
      return currentCard.rthOrder ?? currentCard.order
    }
    return currentCard.order
  }, [currentCard, settings.orderMode])

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
            hanziWriterId={currentCard.hanziWriterId}
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
              disabled={!cardCompleted || !pendingRating}
              onClick={handleNextCard}
            >
              Next
            </button>
          </div>
          {settings.debug && (
            <div className="grading-buttons">
              {(Object.keys(ratingLabels) as ReviewRating[]).map((rating) => (
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
