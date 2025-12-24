import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { StrokeAnimator } from './components/StrokeAnimator'
import { SettingsPanel } from './components/SettingsPanel'
import { DeckManager } from './components/DeckManager'
import { useScheduler } from './hooks/useScheduler'
import type { ReviewRating } from './srs/types'
import type { QuizSummary } from 'hanzi-writer'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { useSettings, ttsSpeedSteps } from './hooks/useSettings'
import { useDeckSelection } from './hooks/useDeckSelection'
import { useVocabExamples } from './hooks/useVocabExamples'
import { db } from './models/db'

const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

const ratingFromMistakes = (count: number, guidedRun: boolean): ReviewRating => {
  if (guidedRun) return 'again'
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

function App() {
  const [writerSize, setWriterSize] = useState(() => getResponsiveWriterSize())
  const { deck, loading, error } = useRememberingDeck()
  const { examples } = useVocabExamples()
  const { settings } = useSettings()
  const orderedDeck = useMemo(() => {
    if (!deck.length) return deck
    if (settings.orderMode === 'rth') {
      return [...deck].sort((a, b) => {
        const aOrder = a.rthOrder ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.rthOrder ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })
    }
    return [...deck].sort((a, b) => a.order - b.order)
  }, [deck, settings.orderMode])
  const { selectedIds, addCards, removeCard, clearAll } = useDeckSelection(deck)
  const playableDeck = useMemo(() => {
    if (!selectedIds.length) return []
    const allowed = new Set(selectedIds)
    return orderedDeck.filter((card) => allowed.has(card.id))
  }, [orderedDeck, selectedIds])
  const [view, setView] = useState<'learn' | 'manage' | 'test'>('learn')
  const { currentCard, dueCount, totalCount, reviewCard, shouldShowOutline, setOutlineLearned } =
    useScheduler(playableDeck)
  const [strokeSession, setStrokeSession] = useState(0)
  const [customTts, setCustomTts] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]
  const currentCardId = currentCard?.id
  const [cardCompleted, setCardCompleted] = useState(false)
  const [pendingRating, setPendingRating] = useState<ReviewRating | null>(null)
  const [showStrokeOutline, setShowStrokeOutline] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setWriterSize(getResponsiveWriterSize())
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCardCompleted(false)
    setPendingRating(null)
    if (currentCardId) {
      setShowStrokeOutline(shouldShowOutline(currentCardId))
    } else {
      setShowStrokeOutline(false)
    }
  }, [currentCardId, shouldShowOutline])

  const handleQuizComplete = useCallback(
    (summary: QuizSummary) => {
      if (!currentCardId) return
      const guidedRun = showStrokeOutline
      const totalMistakes = summary.totalMistakes ?? 0
      const rating = ratingFromMistakes(totalMistakes, guidedRun)
      const outlineLearned = guidedRun ? totalMistakes === 0 : rating === 'easy' || rating === 'good'

      setOutlineLearned(currentCardId, outlineLearned)
      setCardCompleted(true)
      setPendingRating(rating)
    },
    [currentCardId, setOutlineLearned, showStrokeOutline],
  )

  const currentCharacter = currentCard?.character
  const buildPronunciationUtterance = (character: string) => {
    const exampleClue = examples[character]?.[0]
    return exampleClue ? `${character}，${exampleClue}嘅${character}` : character
  }

  useEffect(() => {
    if (!currentCharacter || !isSupported) return
    const timer = window.setTimeout(() => {
      playPronunciation(buildPronunciationUtterance(currentCharacter), { rate: voiceRate })
    }, PRONUNCIATION_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [currentCharacter, examples, isSupported, playPronunciation, voiceRate])

  const navClass = (target: 'learn' | 'manage' | 'test') => `nav-tab${view === target ? ' is-active' : ''}`

  const handleCustomPlayback = () => {
    if (!customTts.trim()) return
    playPronunciation(customTts, { rate: voiceRate })
  }

  const SettingsButton = ({ inline = false }: { inline?: boolean }) => (
    <button
      type="button"
      className={`settings-trigger${inline ? ' inline' : ''}`}
      onClick={() => setSettingsOpen(true)}
      aria-label="Open settings"
    >
      ⚙️
    </button>
  )

  const NavTabs = () => (
    <div className="nav-tabs">
      <button type="button" className={navClass('learn')} onClick={() => setView('learn')}>
        Learn
      </button>
      <button type="button" className={navClass('manage')} onClick={() => setView('manage')}>
        Build deck
      </button>
      <button type="button" className={navClass('test')} onClick={() => setView('test')}>
        Test
      </button>
    </div>
  )

  const handleCardPronunciation = () => {
    if (!currentCard) return
    const character = currentCard.character
    playPronunciation(buildPronunciationUtterance(character), { rate: voiceRate })
  }

  const handleRating = (rating: ReviewRating) => {
    setPendingRating(rating)
    setCardCompleted(true)
  }

  const handleStrokeReset = () => {
    setStrokeSession((prev) => prev + 1)
    setCardCompleted(false)
    setPendingRating(null)
  }

  const handleNextCard = () => {
    if (!pendingRating || !currentCard) return
    reviewCard(currentCard.id, pendingRating)
    setPendingRating(null)
    setCardCompleted(false)
  }

  let pageContent: JSX.Element

  if (loading) {
    pageContent = (
      <main className="app-shell">
        <div className="empty-state">
          <p>Loading characters…</p>
        </div>
      </main>
    )
  } else if (error) {
    pageContent = (
      <main className="app-shell">
        <div className="empty-state">
          <p>Failed to load deck.</p>
          <p className="error-detail">{error}</p>
        </div>
      </main>
    )
  } else if (view === 'manage') {
    pageContent = (
      <>
        <SettingsButton />
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={20} />
              <p className="eyebrow">Canto Writer</p>
            </div>
            <NavTabs />
          </header>
          <DeckManager
            deck={deck}
            selectedIds={selectedIds}
            addCards={addCards}
            removeCard={removeCard}
            clearAll={clearAll}
            onBack={() => setView('learn')}
            orderMode={settings.orderMode}
          />
        </main>
      </>
    )
  } else if (view === 'test') {
    pageContent = (
      <>
        <SettingsButton />
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={20} />
              <div>
                <p className="eyebrow">Canto Writer</p>
              </div>
            </div>
            <NavTabs />
            <p className="tagline">Paste any Cantonese characters to hear the current TTS settings.</p>
          </header>

          <section className="test-panel">
            <div className="custom-tts">
              <input
                type="text"
                className="custom-tts-input"
                placeholder="Type Cantonese text"
                value={customTts}
                onChange={(event) => setCustomTts(event.target.value)}
              />
              <button
                type="button"
                className="custom-tts-button"
                onClick={handleCustomPlayback}
                disabled={!isSupported || customTts.trim().length === 0}
              >
                Play
              </button>
            </div>
            <button type="button" className="custom-tts-button" onClick={() => db.cloud.login()}>
              Login
            </button>
            {!isSupported && <p className="empty-hint">Speech synthesis is not supported in this browser.</p>}
          </section>
        </main>
      </>
    )
  } else if (!currentCard || playableDeck.length === 0) {
    pageContent = (
      <>
        <SettingsButton />
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={20} />
              <div>
                <p className="eyebrow">Canto Writer</p>
              </div>
            </div>
            <NavTabs />
          </header>
          <div className="empty-state">
            <p>Your study deck is empty. Add characters from the RTH list to begin.</p>
            <button type="button" className="clear-link" onClick={() => setView('manage')}>
              Open deck builder
            </button>
          </div>
        </main>
      </>
    )
  } else {
    const displayOrder =
      settings.orderMode === 'rth'
        ? currentCard.rthOrder ?? currentCard.order
        : currentCard.order
    const orderLabel = settings.orderMode === 'rth' ? 'RTH frame' : 'Opt frame'
    pageContent = (
      <main className="app-shell">
        <header className="app-header">
          <div className="header-row">
            <div className="brand-mark">
              <LogoMark size={20} />
              <p className="eyebrow">Canto Writer</p>
            </div>
            <SettingsButton inline />
          </div>
          <div className="nav-row">
            <NavTabs />
            <div className="session-meta" aria-live="polite">
              <span>Due</span>
              <strong>
                {dueCount}
                <span className="total"> / {totalCount}</span>
              </strong>
            </div>
          </div>
        </header>

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
      </main>
    )
  }

  return (
    <>
      {pageContent}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default App
