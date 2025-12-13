import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { LogoMark } from './components/LogoMark'
import { StrokeAnimator } from './components/StrokeAnimator'
import { SettingsPanel } from './components/SettingsPanel'
import { DeckManager } from './components/DeckManager'
import { useScheduler, type ReviewRating } from './hooks/useScheduler'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'
import { useSettings, ttsSpeedSteps } from './hooks/useSettings'
import { useDeckSelection } from './hooks/useDeckSelection'

const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

function App() {
  const { deck, loading, error } = useRememberingDeck()
  const { settings, updateSetting } = useSettings()
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
  const { currentCard, dueCount, totalCount, reviewCard } = useScheduler(playableDeck)
  const [strokeSession, setStrokeSession] = useState(0)
  const [showReveal, setShowReveal] = useState(false)
  const strokeContainerRef = useRef<HTMLDivElement | null>(null)
  const [strokeSize, setStrokeSize] = useState(0)
  const [customTts, setCustomTts] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]
  const revealGrading = useCallback(() => setShowReveal(true), [])

  useEffect(() => {
    const node = strokeContainerRef.current
    if (!node) return
    const updateSize = () => {
      const width = node.getBoundingClientRect().width
      if (!width) return
      setStrokeSize((prev) => {
        const next = Math.round(width)
        return prev === next ? prev : next
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [currentCard?.id, view])

  if (loading) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <p>Loading characters…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <p>Failed to load deck.</p>
          <p className="error-detail">{error}</p>
        </div>
      </main>
    )
  }

  const navClass = (target: 'learn' | 'manage' | 'test') => `nav-tab${view === target ? ' is-active' : ''}`

  const handleCustomPlayback = () => {
    if (!customTts.trim()) return
    playPronunciation(customTts, { rate: voiceRate })
  }

  if (view === 'manage') {
    return (
      <>
        <button
          type="button"
          className="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙️
        </button>
        <main className="app-shell">
          <DeckManager
            deck={deck}
            selectedIds={selectedIds}
            addCards={addCards}
            removeCard={removeCard}
            clearAll={clearAll}
            onBack={() => setView('learn')}
          />
        </main>
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          ttsSpeed={settings.ttsSpeed}
          onTtsSpeedChange={(value) => updateSetting('ttsSpeed', value)}
          orderMode={settings.orderMode}
          onOrderModeChange={(mode) => updateSetting('orderMode', mode)}
        />
      </>
    )
  }

  if (view === 'test') {
    return (
      <>
        <button
          type="button"
          className="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙️
        </button>
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={56} />
              <div>
                <p className="eyebrow">Canto Writer</p>
                <h1>Try the voice</h1>
              </div>
            </div>
            <div className="nav-tabs">
              <button type="button" className={navClass('learn')} onClick={() => setView('learn')}>
                Learn
              </button>
              <button type="button" className={navClass('manage')} onClick={() => setView('manage')}>
                Build deck
              </button>
              <button type="button" className={navClass('test')}>
                Test
              </button>
            </div>
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
            {!isSupported && <p className="empty-hint">Speech synthesis is not supported in this browser.</p>}
          </section>
        </main>
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          ttsSpeed={settings.ttsSpeed}
          onTtsSpeedChange={(value) => updateSetting('ttsSpeed', value)}
          orderMode={settings.orderMode}
          onOrderModeChange={(mode) => updateSetting('orderMode', mode)}
        />
      </>
    )
  }

  if (!currentCard || playableDeck.length === 0) {
    return (
      <>
        <button
          type="button"
          className="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙️
        </button>
        <main className="app-shell">
          <header className="app-header">
            <div className="brand-mark">
              <LogoMark size={56} />
              <div>
                <p className="eyebrow">Canto Writer</p>
                <h1>Daily character flow</h1>
              </div>
            </div>
            <div className="nav-tabs">
              <button type="button" className={navClass('learn')}>
                Learn
              </button>
              <button type="button" className={navClass('manage')} onClick={() => setView('manage')}>
                Build deck
              </button>
              <button type="button" className={navClass('test')} onClick={() => setView('test')}>
                Test
              </button>
            </div>
          </header>
          <div className="empty-state">
            <p>Your study deck is empty. Add characters from the RTH list to begin.</p>
            <button type="button" className="clear-link" onClick={() => setView('manage')}>
              Open deck builder
            </button>
          </div>
        </main>
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          ttsSpeed={settings.ttsSpeed}
          onTtsSpeedChange={(value) => updateSetting('ttsSpeed', value)}
          orderMode={settings.orderMode}
          onOrderModeChange={(mode) => updateSetting('orderMode', mode)}
        />
      </>
    )
  }

  const displayOrder =
    settings.orderMode === 'rth'
      ? currentCard.rthOrder ?? currentCard.order
      : currentCard.order
  const orderLabel = settings.orderMode === 'rth' ? 'RTH frame' : 'Opt frame'
  const handleCardPronunciation = () => {
    playPronunciation(currentCard.character, { rate: voiceRate })
  }

  const handleRating = (rating: ReviewRating) => {
    reviewCard(currentCard.id, rating)
    setShowReveal(false)
  }

  const handleStrokeReset = () => {
    setStrokeSession((prev) => prev + 1)
  }

  return (
    <>
      <button
        type="button"
        className="settings-trigger"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙️
      </button>
      <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark">
          <LogoMark size={56} />
          <div>
            <p className="eyebrow">Canto Writer</p>
            <h1>Daily character flow</h1>
          </div>
        </div>
        <div className="nav-tabs">
          <button type="button" className={navClass('learn')}>
            Learn
          </button>
          <button type="button" className={navClass('manage')} onClick={() => setView('manage')}>
            Build deck
          </button>
          <button type="button" className={navClass('test')} onClick={() => setView('test')}>
            Test
          </button>
        </div>
        <div className="session-meta" aria-live="polite">
          <span>Due today</span>
          <strong>{dueCount}</strong>
          <span className="total">/ {totalCount}</span>
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

          <div className="stroke-wrapper" ref={strokeContainerRef}>
            <div className="stroke-header">
              <button type="button" className="clear-button" onClick={handleStrokeReset} aria-label="Clear strokes">
                Clear
              </button>
            </div>
            <StrokeAnimator
              character={currentCard.character}
              hanziWriterId={currentCard.hanziWriterId}
              sessionKey={strokeSession}
              size={strokeSize || undefined}
              onComplete={revealGrading}
            />
          </div>

          <div className="card-actions">
            {!showReveal ? (
              <button className="reveal" onClick={revealGrading}>
                Reveal grading
              </button>
            ) : (
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
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        ttsSpeed={settings.ttsSpeed}
        onTtsSpeedChange={(value) => updateSetting('ttsSpeed', value)}
        orderMode={settings.orderMode}
        onOrderModeChange={(mode) => updateSetting('orderMode', mode)}
      />
    </>
  )
}

export default App
