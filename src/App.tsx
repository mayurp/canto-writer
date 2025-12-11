import { useState } from 'react'
import './App.css'
import { StrokeAnimator } from './components/StrokeAnimator'
import { LogoMark } from './components/LogoMark'
import { useScheduler, type ReviewRating } from './hooks/useScheduler'
import { useRememberingDeck } from './hooks/useRememberingDeck'
import { useCantonesePronunciation } from './hooks/useCantonesePronunciation'

const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

function App() {
  const { deck, loading, error } = useRememberingDeck()
  const { currentCard, dueCount, totalCount, reviewCard } = useScheduler(deck)
  const [showAnswer, setShowAnswer] = useState(false)
  const { playPronunciation, speaking, isSupported } = useCantonesePronunciation()

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

  if (!currentCard) {
    return (
      <main className="app-shell">
        <div className="empty-state">
          <p>Deck empty for now. Add a few cards to keep practicing!</p>
        </div>
      </main>
    )
  }

  const handleReveal = () => setShowAnswer(true)

  const handleRating = (rating: ReviewRating) => {
    reviewCard(currentCard.id, rating)
    setShowAnswer(false)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark">
          <LogoMark size={56} />
          <div>
            <p className="eyebrow">Canto Writer</p>
            <h1>Daily character flow</h1>
          </div>
        </div>
        <p className="tagline">Learn traditional characters with Jyutping and animated stroke order.</p>
        <div className="session-meta" aria-live="polite">
          <span>Due today</span>
          <strong>{dueCount}</strong>
          <span className="total">/ {totalCount}</span>
        </div>
      </header>

      <section className="card-stage">
        <div className="card-panel">
          <div className="card-character" aria-label="Character">
            {currentCard.character}
          </div>
          <div className="card-meta">
            <p className="card-order">Frame #{currentCard.order}</p>
            <button
              type="button"
              className="audio-button"
              onClick={() => playPronunciation(currentCard.character)}
              disabled={!isSupported}
              aria-label={speaking ? 'Playing pronunciation' : 'Play Cantonese audio'}
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
              <p className="meaning meaning-hidden">Reveal keyword</p>
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
          <p className="panel-label">Stroke order</p>
          <StrokeAnimator character={currentCard.character} hanziWriterId={currentCard.hanziWriterId} />
        </div>
      </section>
    </main>
  )
}

export default App
