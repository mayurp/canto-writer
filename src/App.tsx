import { useState } from 'react'
import './App.css'
import { StrokeAnimator } from './components/StrokeAnimator'
import { starterDeck } from './data/cards'
import { useScheduler, type ReviewRating } from './hooks/useScheduler'

const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

function App() {
  const { currentCard, dueCount, totalCount, reviewCard } = useScheduler(starterDeck)
  const [showAnswer, setShowAnswer] = useState(false)

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
        <div>
          <p className="eyebrow">Canto Writer</p>
          <h1>Daily character flow</h1>
          <p className="tagline">Learn traditional characters with Jyutping and animated stroke order.</p>
        </div>
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
            <p className="jyutping">{currentCard.jyutping}</p>
            <p className="meaning">{currentCard.meaning}</p>
          </div>

          {showAnswer && (
            <div className="card-details">
              <p className="example">
                <span className="example-hanzi">{currentCard.example.hanzi}</span>
                <span className="example-jyutping">{currentCard.example.jyutping}</span>
                <span className="example-translation">{currentCard.example.translation}</span>
              </p>
              {currentCard.notes && <p className="card-notes">{currentCard.notes}</p>}
            </div>
          )}

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
