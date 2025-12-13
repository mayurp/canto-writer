import { useMemo, useState } from 'react'
import './App.css'
import { StrokeAnimator } from './components/StrokeAnimator'
import { LogoMark } from './components/LogoMark'
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
  const [view, setView] = useState<'learn' | 'manage'>('learn')
  const { currentCard, dueCount, totalCount, reviewCard } = useScheduler(playableDeck)
  const [showAnswer, setShowAnswer] = useState(false)
  const [practiceMode, setPracticeMode] = useState<'watch' | 'write'>('watch')
  const [strokeSession, setStrokeSession] = useState(0)
  const [customTts, setCustomTts] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()
  const voiceRate = ttsSpeedSteps[settings.ttsSpeed] ?? ttsSpeedSteps[2]

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
              <button type="button" className="nav-tab is-active">
                Learn
              </button>
              <button type="button" className="nav-tab" onClick={() => setView('manage')}>
                Build deck
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

  const handleCustomPlayback = () => {
    if (!customTts.trim()) return
    playPronunciation(customTts, { rate: voiceRate })
  }

  const handleReveal = () => setShowAnswer(true)

  const handleRating = (rating: ReviewRating) => {
    reviewCard(currentCard.id, rating)
    setShowAnswer(false)
  }

  const handleModeChange = (mode: 'watch' | 'write') => {
    setPracticeMode(mode)
    setStrokeSession((prev) => prev + 1)
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
          <button type="button" className="nav-tab is-active">
            Learn
          </button>
          <button type="button" className="nav-tab" onClick={() => setView('manage')}>
            Build deck
          </button>
        </div>
        <p className="tagline">Learn traditional characters with Jyutping and animated stroke order.</p>
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
        <div className="header-actions">
          <button type="button" className="deck-link" onClick={() => setView('manage')}>
            Build deck
          </button>
          <div className="session-meta" aria-live="polite">
            <span>Due today</span>
            <strong>{dueCount}</strong>
            <span className="total">/ {totalCount}</span>
          </div>
        </div>
      </header>

      <section className="card-stage">
        <div className="card-panel">
          <div
            className={`card-character ${showAnswer ? 'show-char' : 'show-keyword'}`}
            aria-label={showAnswer ? 'Character' : 'Keyword'}
          >
            {showAnswer ? currentCard.character : currentCard.meaning}
          </div>
          <div className="card-meta">
            <p className="card-order">
              {orderLabel} #{displayOrder}
            </p>
            <button
              type="button"
              className="audio-button"
              onClick={handleCardPronunciation}
              disabled={!isSupported}
              aria-label={speaking ? 'Playing pronunciation' : 'Play Cantonese audio'}
            >
              <svg
                className="audio-glyph"
                viewBox="0 0 64 64"
                role="presentation"
                aria-hidden="true"
              >
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
            {showAnswer ? (
              <p className="meaning">{currentCard.meaning}</p>
            ) : (
              <p className="keyword-hint">Tap reveal to view the character</p>
            )}
          </div>

          <div className="card-actions">
            {!showAnswer ? (
              <button className="reveal" onClick={handleReveal}>
                Show answer
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

        <div className="stroke-panel">
          <div className="stroke-panel-header">
            <p className="panel-label">Stroke practice</p>
            <div className="stroke-controls">
              <div className="mode-toggle" role="group" aria-label="Stroke practice mode">
                <button
                  type="button"
                  className={`toggle-button ${practiceMode === 'watch' ? 'is-active' : ''}`}
                  onClick={() => handleModeChange('watch')}
                >
                  Watch
                </button>
                <button
                  type="button"
                  className={`toggle-button ${practiceMode === 'write' ? 'is-active' : ''}`}
                  onClick={() => handleModeChange('write')}
                >
                  Write
                </button>
              </div>
              <button
                type="button"
                className="clear-button"
                onClick={handleStrokeReset}
                aria-label="Clear stroke practice"
              >
                Clear
              </button>
            </div>
          </div>
          <StrokeAnimator
            character={currentCard.character}
            hanziWriterId={currentCard.hanziWriterId}
            mode={practiceMode}
            sessionKey={strokeSession}
          />
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
