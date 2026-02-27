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
import { useUserStatsContext } from '../context/UserStatsContext'
import { useCharacterDataContext } from '../context/CharacterDataContext'
import { PointsAnimationLayer } from './PointsAnimation'
import { ComponentCards } from './ComponentCards'
import { CharacterSearch } from './CharacterSearch'
import { buildPronunciationUtterance } from '../utils/pronunciation'
import { AudioButton } from './AudioButton'
import { PointsSoundVariant } from '../utils/pointsSound'

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
const POINTS_GUIDED_BONUS = 10
const POINTS_RATING_BONUS: Record<ReviewRatingType, number> = {
  [ReviewRating.Again]: 0,
  [ReviewRating.Hard]: 10,
  [ReviewRating.Good]: 20,
  [ReviewRating.Easy]: 50,
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

const getSoundVariant = (points: number): PointsSoundVariant => {
  if (points >= 35) return PointsSoundVariant.Perfect
  if (points >= 30) return PointsSoundVariant.Great
  if (points >= 20) return PointsSoundVariant.Good
  return PointsSoundVariant.Standard
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
  const { animationState } = useUserStatsContext()
  const { characterData } = useCharacterDataContext()
  const triggerPointsAnimation = animationState.trigger
  const [writerSize, setWriterSize] = useState(DEFAULT_WRITER_SIZE)
  const [strokeSession, setStrokeSession] = useState(0)
  const [cardCompleted, setCardCompleted] = useState(false)
  const [pendingGrading, setPendingGrading] = useState<GradingInfo | null>(null)
  const [debugCharacterOverride, setDebugCharacterOverride] = useState<
    string | null
  >(null)

  const currentCardId = currentCard?.id ?? null
  const showStrokeOutline = currentCardId
    ? shouldShowOutline(currentCardId)
    : false
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

  const currentCharacter = currentCard?.character
  const isDebugOverride = debugCharacterOverride !== null
  const displayCharacter = debugCharacterOverride || currentCharacter
  const displayMeaning =
    isDebugOverride && displayCharacter && characterData
      ? characterData.getKeyword(displayCharacter, true)
      : currentCard?.meaning

  useEffect(() => {
    // This is triggered twice, once on intialization (examples empty) and 2nd time
    // when examples finishing loading. We early out to prevent audio playing twice
    // and also so we have the example text for buildPronunciationUtterance
    const loadedExamples = Object.keys(examples).length > 0
    if (!isSupported || !displayCharacter || !loadedExamples) return
    const timer = window.setTimeout(() => {
      playPronunciation(
        buildPronunciationUtterance(displayCharacter, examples),
        { rate: voiceRate },
      )
    }, PRONUNCIATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [
    currentCard,
    displayCharacter,
    examples,
    isSupported,
    playPronunciation,
    voiceRate,
  ])

  const handleCardPronunciation = useCallback(() => {
    if (!isSupported || !displayCharacter) return
    playPronunciation(buildPronunciationUtterance(displayCharacter, examples), {
      rate: voiceRate,
    })
  }, [displayCharacter, examples, isSupported, playPronunciation, voiceRate])

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
      const soundVariant = getSoundVariant(points)
      setPendingGrading({ rating, learnedOutline })
      triggerPointsAnimation(points, soundVariant)
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
    [currentCard],
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
    setDebugCharacterOverride(null)
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

  // PointsAnimationLayer is outside the keyed card div so that animation and
  // sounds in flight aren't destroyed and restarted if the user presses 'Next'
  // part way through.

  return (
    <section className="card-stage">
      <PointsAnimationLayer />
      <div
        className={`study-card ${settings.debug ? 'has-debug' : ''}`}
        key={currentCard.id}
      >
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
              {displayMeaning}
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

        <div className="component-cards-wrapper">
          {/* TODO: investigate — displayCharacter can theoretically be undefined here,
              passing '' may cause unexpected rendering in ComponentCards */}
          <ComponentCards
            character={displayCharacter ?? ''}
            visible={isDebugOverride || showStrokeOutline}
          />
        </div>

        <div ref={strokeWrapperRef} className="stroke-wrapper">
          {/* TODO: investigate — passing '' to HanziWriter when displayCharacter is undefined */}
          <StrokeAnimator
            character={displayCharacter ?? ''}
            size={writerSize}
            sessionKey={strokeSession}
            showOutline={isDebugOverride || showStrokeOutline}
            staticColors={isDebugOverride}
            onQuizComplete={handleQuizComplete}
            onClearStrokes={handleStrokeReset}
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

      {settings.debug && (
        <div className="debug-search-wrapper">
          <CharacterSearch
            initialCharacter={displayCharacter}
            onSearch={setDebugCharacterOverride}
            showSlider={true}
          />
        </div>
      )}
    </section>
  )
}
