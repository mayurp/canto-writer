import { useMemo, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { OrderMode } from '../hooks/useSettings'
import { createSrsManager } from '../srs/createManager'
import type { CardStats } from '../srs/fsrsAlgorithm'
import { State } from 'ts-fsrs'

type DeckManagerProps = {
  deck: FlashcardDefinition[]
  selectedIds: string[]
  addCards: (ids: string[]) => void
  removeCard: (id: string) => void
  clearAll: () => void
  onBack: () => void
  orderMode: OrderMode
}

const byId = (deck: FlashcardDefinition[]) =>
  deck.reduce<Record<string, FlashcardDefinition>>((acc, card) => {
    acc[card.id] = card
    return acc
  }, {})

export function DeckManager({
  deck,
  selectedIds,
  addCards,
  removeCard,
  clearAll,
  onBack,
  orderMode,
}: DeckManagerProps) {
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [charInput, setCharInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const deckById = useMemo(() => byId(deck), [deck])
  const deckByFrame = useMemo(() => {
    return deck.reduce<Record<number, FlashcardDefinition>>((acc, card) => {
      const key = orderMode === 'rth' ? card.rthOrder : card.order
      if (typeof key === 'number' && Number.isFinite(key)) {
        acc[key] = card
      }
      return acc
    }, {})
  }, [deck, orderMode])

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
      const card = deckByFrame[i]
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

  const statsById = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const manager = createSrsManager(deck)
    return manager.getCards().reduce<Record<string, CardStats>>((acc, entry) => {
      acc[entry.id] = entry.stats
      return acc
    }, {})
  }, [deck])

  const selectedCards = selectedIds.map((id) => deckById[id]).filter(Boolean)

  const stateLabels: Record<State, string> = {
    [State.New]: 'New',
    [State.Learning]: 'Learning',
    [State.Review]: 'Review',
    [State.Relearning]: 'Relearning',
  }

  const formatState = (stats?: CardStats) => {
    if (!stats) return '—'
    return stateLabels[stats.state] ?? '—'
  }

  const formatDue = (stats?: CardStats) => {
    if (!stats) return '—'
    const diffMs = stats.due.getTime() - Date.now()
    if (diffMs <= 0) return 'Due now'
    const diffMinutes = diffMs / 60000
    if (diffMinutes < 60) return `${Math.round(diffMinutes)}m`
    const diffHours = diffMinutes / 60
    if (diffHours < 24) return `${Math.round(diffHours)}h`
    const diffDays = diffHours / 24
    if (diffDays < 30) return `${Math.round(diffDays)}d`
    const diffMonths = diffDays / 30
    return `${Math.round(diffMonths)}mo`
  }

  const formatStability = (stats?: CardStats) => {
    if (!stats) return '—'
    return `${stats.stability.toFixed(1)}`
  }

  const [sortColumn, setSortColumn] = useState<'rth' | 'opt' | 'character' | 'meaning' | 'state' | 'due' | 'stability'>(
    'rth',
  )
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const sortedSelectedCards = useMemo(() => {
    const sorted = [...selectedCards]
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      const statsA = statsById[a.id]
      const statsB = statsById[b.id]
      switch (sortColumn) {
        case 'character':
          return a.character.localeCompare(b.character) * directionMultiplier
        case 'meaning':
          return a.meaning.localeCompare(b.meaning) * directionMultiplier
        case 'rth': {
          const frameA = a.rthOrder ?? Number.MAX_SAFE_INTEGER
          const frameB = b.rthOrder ?? Number.MAX_SAFE_INTEGER
          return (frameA - frameB) * directionMultiplier
        }
        case 'opt': {
          const frameA = a.order ?? Number.MAX_SAFE_INTEGER
          const frameB = b.order ?? Number.MAX_SAFE_INTEGER
          return (frameA - frameB) * directionMultiplier
        }
        case 'state': {
          const stateA = statsA?.state ?? State.New
          const stateB = statsB?.state ?? State.New
          return (stateA - stateB) * directionMultiplier
        }
        case 'due': {
          const dueA = statsA?.due.getTime() ?? 0
          const dueB = statsB?.due.getTime() ?? 0
          return (dueA - dueB) * directionMultiplier
        }
        case 'stability': {
          const stabilityA = statsA?.stability ?? 0
          const stabilityB = statsB?.stability ?? 0
          return (stabilityA - stabilityB) * directionMultiplier
        }
        default:
          return 0
      }
    })
    return sorted
  }, [selectedCards, sortColumn, sortDirection, orderMode, statsById])

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const renderSortIndicator = (column: typeof sortColumn) => {
    if (sortColumn !== column) return null
    return <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <section className="manager-panel">
      <header className="manager-header">
        <div>
          <h1>Compose your study run</h1>
          <p className="tagline">
            Add characters by {orderMode === 'rth' ? 'original RTH frames' : 'optimized frames'} or paste specific hanzi you
            want to learn.
          </p>
        </div>
      </header>

      <div className="manager-grid">
        <div className="manager-card">
          <h2>Add by {orderMode === 'rth' ? 'RTH' : 'Optimized'} range</h2>
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
          <div className="selected-table-wrapper">
            <table className="selected-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('rth')}>
                      RTH # {renderSortIndicator('rth')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('opt')}>
                      Opt RTH # {renderSortIndicator('opt')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('character')}>
                      Character {renderSortIndicator('character')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('meaning')}>
                      Meaning {renderSortIndicator('meaning')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('state')}>
                      SRS state {renderSortIndicator('state')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('due')}>
                      Due {renderSortIndicator('due')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('stability')}>
                      Stability {renderSortIndicator('stability')}
                    </button>
                  </th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sortedSelectedCards.map((card) => {
                  const stats = statsById[card.id]
                  return (
                    <tr key={card.id}>
                      <td>{card.rthOrder ?? '—'}</td>
                      <td>{card.order ?? '—'}</td>
                      <td className="selected-character">{card.character}</td>
                      <td>{card.meaning}</td>
                      <td>{formatState(stats)}</td>
                      <td>{formatDue(stats)}</td>
                      <td>{formatStability(stats)}</td>
                      <td>
                        <button className="selected-remove" onClick={() => removeCard(card.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
