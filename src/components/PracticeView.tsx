import './styles/PracticeView.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuizSummary } from 'hanzi-writer'
import { StrokeAnimator } from './StrokeAnimator'
import { useSettingsContext } from '../context/SettingsContext'
import { useSchedulerContext } from '../context/SchedulerContext'
import { useVocabExamplesContext } from '../context/VocabExamplesContext'
import { useUserStatsContext } from '../context/UserStatsContext'
import { useCharacterDataContext } from '../context/CharacterDataContext'
import { PointsAnimationLayer } from './PointsAnimation'
import { ConfettiAnimation } from './ConfettiAnimation'
import { ComponentCards } from './ComponentCards'
import { CharacterSearch } from './CharacterSearch'
import { buildPronunciationUtterance } from '../utils/pronunciation'
import { AudioButton } from './AudioButton'
import { ReviewRating } from '../srs/types'
import type { GradingInfo } from '../srs/types'
import type { ReviewRating as ReviewRatingType } from '../srs/types'
import {
  computeLearnedOutline,
  computePoints,
  getSoundVariant,
  ratingFromMistakes,
} from '../srs/quizGrading'
import { playPointsSound, PointsSoundVariant } from '../utils/pointsSound'

const ratingLabels: Record<ReviewRatingType, string> = {
  [ReviewRating.Again]: 'Again',
  [ReviewRating.Hard]: 'Hard',
  [ReviewRating.Good]: 'Good',
  [ReviewRating.Easy]: 'Easy',
}

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

  const [writerSize, setWriterSize] = useState<number | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const [pendingGrading, setPendingGrading] = useState<GradingInfo | null>(null)
  const [hintTrigger, setHintTrigger] = useState(0)
  const [debugCharacterOverride, setDebugCharacterOverride] = useState<
    string | null
  >(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const currentCardId = currentCard?.id ?? null
  const showStrokeOutline = currentCardId
    ? shouldShowOutline(currentCardId)
    : false
  const isCompleted = pendingGrading !== null
  const nextButtonEnabled = pendingGrading !== null

  const strokeWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSessionKey(0)
    setPendingGrading(null)
    setHintTrigger(0)
  }, [currentCardId])

  useEffect(() => {
    // If the card is null, the observer mounting logic above handles it.
    // We add currentCardId to deps so that if the element remounts with the same
    // instance, we re-observe.
    if (!strokeWrapperRef.current || typeof ResizeObserver === 'undefined')
      return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setWriterSize((prev) => {
            const next = calculateWriterSize(width, height)
            return prev === null || Math.abs(prev - next) > 2 ? next : prev
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
    const loadedExamples = Object.keys(examples).length > 0
    if (!isSupported || !displayCharacter || !loadedExamples) return
    const timer = window.setTimeout(() => {
      playPronunciation(
        buildPronunciationUtterance(displayCharacter, examples),
        { rate: voiceRate },
      )
    }, PRONUNCIATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [displayCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleCardPronunciation = useCallback(() => {
    if (!isSupported || !displayCharacter) return
    playPronunciation(buildPronunciationUtterance(displayCharacter, examples), {
      rate: voiceRate,
    })
  }, [displayCharacter, examples, isSupported, playPronunciation, voiceRate])

  const handleQuizComplete = useCallback(
    (summary: QuizSummary) => {
      const rating = ratingFromMistakes(summary, showStrokeOutline)
      const learnedOutline = computeLearnedOutline(
        showStrokeOutline,
        summary,
        rating,
      )
      const points = computePoints({
        guidedMode: showStrokeOutline,
        learnedOutline,
        rating,
      })

      setPendingGrading({ rating, learnedOutline })
      triggerPointsAnimation(points)
      // TODO: using "resolved" grading which takes leanredOutput into
      // account instead of using points to determine sound variant
      // and confetti trigger
      const soundVariant = getSoundVariant(points)
      playPointsSound(soundVariant)
      if (soundVariant === PointsSoundVariant.Perfect)
        setConfettiTrigger((c) => c + 1)
    },
    [showStrokeOutline, triggerPointsAnimation],
  )

  const handleStrokeReset = useCallback(() => {
    setPendingGrading(null)
    setSessionKey((current) => current + 1)
  }, [])

  const submitGrade = useCallback(
    (grading: GradingInfo) => {
      if (!currentCardId) return
      gradeCard(currentCardId, grading)
      setPendingGrading(null)
      setHintTrigger(0)
      setSessionKey((current) => current + 1)
      setDebugCharacterOverride(null)
    },
    [currentCardId, gradeCard],
  )

  const handleNextCard = useCallback(() => {
    if (!pendingGrading) return
    submitGrade(pendingGrading)
  }, [pendingGrading, submitGrade])

  const handleDebugRating = useCallback(
    (rating: ReviewRatingType) => {
      submitGrade({
        rating,
        learnedOutline:
          pendingGrading?.learnedOutline ??
          currentCard?.learnedOutline ??
          false,
      })
    },
    [currentCard?.learnedOutline, pendingGrading, submitGrade],
  )

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
      <PointsAnimationLayer />
      <ConfettiAnimation trigger={confettiTrigger} />
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
            {(isCompleted || showStrokeOutline) && currentCard.story && (
              <div className="card-story">
                <p>{currentCard.story}</p>
              </div>
            )}
          </div>
        </div>

        <div className="component-cards-wrapper">
          <ComponentCards
            character={displayCharacter ?? ''}
            visible={isDebugOverride || showStrokeOutline}
            onClick={() => setHintTrigger((c) => c + 1)}
          />
        </div>

        <div ref={strokeWrapperRef} className="stroke-wrapper">
          {writerSize !== null && (
            <StrokeAnimator
              character={displayCharacter ?? ''}
              size={writerSize}
              sessionKey={sessionKey}
              showOutline={isDebugOverride || showStrokeOutline}
              debugStrokeColors={isDebugOverride}
              onQuizComplete={handleQuizComplete}
              onClearStrokes={handleStrokeReset}
              hintTrigger={hintTrigger}
            />
          )}
        </div>

        <div className="card-actions">
          <div className="next-button-container">
            <button
              type="button"
              className="next-button"
              disabled={!nextButtonEnabled}
              onClick={handleNextCard}
            >
              Next
            </button>
          </div>
          {isCompleted && settings.debug && (
            <div className="grading-buttons">
              {(Object.keys(ratingLabels) as ReviewRatingType[]).map(
                (rating) => (
                  <button
                    key={rating}
                    className={`grade-button grade-${rating}`}
                    onClick={() => handleDebugRating(rating)}
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
