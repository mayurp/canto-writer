import './styles/PracticeView.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuizSummary } from 'hanzi-writer'
import {
  ReviewRating,
  type ReviewRating as ReviewRatingType,
  type GradingInfo,
} from '../srs/types'
import { StrokeAnimator } from './StrokeAnimator'
import { useSettingsContext } from '../context/SettingsContext'
import { useSchedulerContext } from '../context/SchedulerContext'
import { useVocabExamplesContext } from '../context/VocabExamplesContext'
import { usePointsContext } from '../context/PointsContext'
import { PointsAnimationLayer } from './PointsAnimation'
import { buildPronunciationUtterance } from '../utils/pronunciation'
import { AudioButton } from './AudioButton'

const ratingLabels: Record<ReviewRatingType, string> = {
  [ReviewRating.Again]: 'Again',
  [ReviewRating.Hard]: 'Hard',
  [ReviewRating.Good]: 'Good',
  [ReviewRating.Easy]: 'Easy',
}

const ratingFromMistakes = (
  summary: QuizSummary,
  guidedRun: boolean,
): ReviewRatingType => {
  if (guidedRun) return ReviewRating.Again
  const count = summary.totalMistakes ?? 0
  if (count === 0) return ReviewRating.Easy
  if (count <= 2) return ReviewRating.Good
  if (count <= 4) return ReviewRating.Hard
  return ReviewRating.Again
}

const POINTS_BASE = 10
const POINTS_GUIDED_BONUS = 20
const POINTS_RATING_BONUS: Record<ReviewRatingType, number> = {
  [ReviewRating.Again]: 0,
  [ReviewRating.Hard]: 5,
  [ReviewRating.Good]: 10,
  [ReviewRating.Easy]: 20,
}

const computePoints = (input: {
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

const DEFAULT_WRITER_SIZE = 220
const PRONUNCIATION_DELAY_MS = 500

const calculateWriterSize = (width: number, height: number) => {
  return Math.min(width, height)
}

type PracticeViewProps = {
  playPronunciation: (text: string, options?: { rate?: number }) => void
  speaking: boolean
  isSupported: boolean
  voiceRate: number
}

const formatWaitTime = (date: Date) => {
  const diffMs = date.getTime() - Date.now()
  if (diffMs <= 0) return 'any moment'
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'}`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'}`
}

export function PracticeView({
  playPronunciation,
  speaking,
  isSupported,
  voiceRate,
}: PracticeViewProps) {
  const { currentCard, gradeCard, shouldShowOutline, nextDueDate, dueCount } =
    useSchedulerContext()
  const { settings } = useSettingsContext()
  const { examples } = useVocabExamplesContext()
  const { triggerPointsAnimation } = usePointsContext()
  const [writerSize, setWriterSize] = useState(DEFAULT_WRITER_SIZE)
  const [strokeSession, setStrokeSession] = useState(0)
  const [cardCompleted, setCardCompleted] = useState(false)
  const [pendingGrading, setPendingGrading] = useState<GradingInfo | null>(null)
  const [showStrokeOutline, setShowStrokeOutline] = useState(false)
  const currentCardId = currentCard?.id ?? null
  const strokeWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!strokeWrapperRef.current || typeof ResizeObserver === 'undefined')
      return

    // Note that a resize will recreate HanziWriter which will reset the stroke session
    // We make an attempt to disable zoom so mostly this will only be triggered by an
    // orientation change.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setWriterSize((prev) => {
            const next = calculateWriterSize(width, height)
            // Only update if change is significant (> 2px) to avoid minor jitter
            return Math.abs(prev - next) > 2 ? next : prev
          })
        }
      }
    })

    observer.observe(strokeWrapperRef.current)
    return () => observer.disconnect()
  }, [currentCardId])

  useEffect(() => {
    setCardCompleted(false)
    setPendingGrading(null)
    setStrokeSession((s) => s + 1)
    if (currentCardId) {
      setShowStrokeOutline(shouldShowOutline(currentCardId))
    }
  }, [currentCard, currentCardId, shouldShowOutline])

  const currentCharacter = currentCard?.character

  useEffect(() => {
    // This is triggered twice, once on intialization (examples empty) and 2nd time
    // when examples finishing loading. We early out to prevent audio playing twice
    // and also so we have the example text for buildPronunciationUtterance
    const loadedExamples = Object.keys(examples).length > 0
    if (!isSupported || !currentCharacter || !loadedExamples) return
    const timer = window.setTimeout(() => {
      playPronunciation(
        buildPronunciationUtterance(currentCharacter, examples),
        { rate: voiceRate },
      )
    }, PRONUNCIATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [
    currentCard,
    currentCharacter,
    examples,
    isSupported,
    playPronunciation,
    voiceRate,
  ])

  const handleCardPronunciation = useCallback(() => {
    if (!isSupported || !currentCharacter) return
    playPronunciation(buildPronunciationUtterance(currentCharacter, examples), {
      rate: voiceRate,
    })
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleQuizComplete = useCallback(
    (summary: QuizSummary) => {
      const guidedRun = showStrokeOutline
      const rating = ratingFromMistakes(summary, guidedRun)
      const learnedOutline = guidedRun
        ? (summary.totalMistakes ?? 0) === 0
        : rating === ReviewRating.Good || rating === ReviewRating.Easy

      const points = computePoints({
        guidedMode: guidedRun,
        learnedOutline,
        rating,
      })

      setCardCompleted(true)
      setPendingGrading({ rating, learnedOutline })
      triggerPointsAnimation(points)
    },
    [showStrokeOutline, triggerPointsAnimation],
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

  if (!currentCard || dueCount === 0) {
    return (
      <div className="empty-state">
        <p>All due cards are complete for now.</p>
        {nextDueDate ? (
          <p className="hint">
            Next review unlocks in about {formatWaitTime(nextDueDate)}.
          </p>
        ) : (
          <p className="hint">
            Add more characters in the Library to keep practicing.
          </p>
        )}
      </div>
    )
  }

  const orderLabel = settings.orderMode === 'rth' ? 'RTH frame' : 'Opt frame'

  return (
    <section className="card-stage">
      <div className="study-card">
        <div className="audio-button-container">
          <AudioButton
            onClick={handleCardPronunciation}
            disabled={!isSupported}
            speaking={speaking}
            ariaLabel={
              speaking ? 'Playing pronunciation' : 'Play Cantonese audio'
            }
          />
        </div>

        <div className="card-top">
          <div className="card-info">
            <div className="card-character" aria-label="Keyword meaning">
              {currentCard.meaning}
            </div>
            <p className="card-order">
              {orderLabel} #{displayOrder}
            </p>
            {(cardCompleted || showStrokeOutline) && currentCard.story && (
              <div className="card-story">
                <p>{currentCard.story}</p>
              </div>
            )}
          </div>
        </div>

        <div ref={strokeWrapperRef} className="stroke-wrapper">
          <StrokeAnimator
            character={currentCard.character}
            size={writerSize}
            sessionKey={strokeSession}
            showOutline={showStrokeOutline}
            onQuizComplete={handleQuizComplete}
            onClearStrokes={handleStrokeReset}
          />
          <PointsAnimationLayer />
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
          {cardCompleted && settings.debug && (
            <div className="grading-buttons">
              {(Object.keys(ratingLabels) as ReviewRatingType[]).map(
                (rating) => (
                  <button
                    key={rating}
                    className={`grade-button grade-${rating}`}
                    onClick={() => handleRating(rating)}
                  >
                    {ratingLabels[rating]}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
