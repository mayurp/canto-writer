import { useMemo, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'

type DeckManagerProps = {
  deck: FlashcardDefinition[]
  selectedIds: string[]
  addCards: (ids: string[]) => void
  removeCard: (id: string) => void
  clearAll: () => void
  onBack: () => void
}

const byId = (deck: FlashcardDefinition[]) =>
  deck.reduce<Record<string, FlashcardDefinition>>((acc, card) => {
    acc[card.id] = card
    return acc
  }, {})

export function DeckManager({ deck, selectedIds, addCards, removeCard, clearAll, onBack }: DeckManagerProps) {
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [charInput, setCharInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const deckById = useMemo(() => byId(deck), [deck])
  const deckByRth = useMemo(() => {
    return deck.reduce<Record<number, FlashcardDefinition>>((acc, card) => {
      if (card.rthOrder) acc[card.rthOrder] = card
      return acc
    }, {})
  }, [deck])

  const handleAddRange = () => {
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
      setMessage('Enter valid frame numbers.')
      return
    }
    const [min, max] = start <= end ? [start, end] : [end, start]
    const ids: string[] = []
    for (let i = min; i <= max; i += 1) {
      const card = deckByRth[i]
      if (card) ids.push(card.id)
    }
    if (!ids.length) {
      setMessage('No cards found for that range.')
      return
    }
    addCards(ids)
    setMessage(`Added ${ids.length} cards.`)
  }

  const handleAddCharacters = () => {
    const chars = Array.from(new Set(charInput.replace(/\s+/g, '').split(''))).filter(Boolean)
    const ids = chars
      .map((char) => deck.find((card) => card.character === char)?.id)
      .filter(Boolean) as string[]
    if (!ids.length) {
      setMessage('No matching characters found.')
      return
    }
    addCards(ids)
    setMessage(`Added ${ids.length} cards.`)
  }

  const selectedCards = selectedIds
    .map((id) => deckById[id])
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <section className="manager-panel">
      <header className="manager-header">
        <div>
          <p className="eyebrow">Deck builder</p>
          <h1>Compose your study run</h1>
          <p className="tagline">Add characters by RTH frame range or paste specific hanzi you want to learn.</p>
        </div>
        <button className="back-link" onClick={onBack}>
          ← Back to practice
        </button>
      </header>

      <div className="manager-grid">
        <div className="manager-card">
          <h2>Add by RTH range</h2>
          <div className="range-form">
            <input
              type="number"
              placeholder="Start frame"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="End frame"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
            />
          </div>
          <button onClick={handleAddRange}>Add range</button>
        </div>

        <div className="manager-card">
          <h2>Add by characters</h2>
          <textarea
            rows={4}
            placeholder="Paste characters like 學講聽寫"
            value={charInput}
            onChange={(event) => setCharInput(event.target.value)}
          />
          <button onClick={handleAddCharacters}>Add characters</button>
        </div>
      </div>

      {message && <p className="manager-message">{message}</p>}

      <section className="selected-panel">
        <div className="selected-header">
          <h2>Selected cards ({selectedCards.length})</h2>
          {selectedCards.length > 0 && (
            <button className="clear-link" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        {selectedCards.length === 0 ? (
          <p className="empty-hint">No cards yet. Add some to start practicing.</p>
        ) : (
          <ul className="selected-list">
            {selectedCards.map((card) => (
              <li key={card.id}>
                <div className="selected-card-meta">
                  <strong>{card.character}</strong>
                  <span>{card.meaning}</span>
                  {card.rthOrder && <small>RTH #{card.rthOrder}</small>}
                </div>
                <button onClick={() => removeCard(card.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
