import { useMemo, useState } from 'react'
import { useSettingsContext } from '../context/SettingsContext'
import { SrsCardState } from '../srs/types'
import { useSchedulerContext } from '../context/SchedulerContext'
import { useVocabExamplesContext } from '../context/VocabExamplesContext'
import { buildPronunciationUtterance } from '../utils/pronunciation'
import { AudioButton } from './AudioButton'

type DeckViewProps = {
  selectedIds: string[]
  playPronunciation: (text: string) => void
  isSpeechSupported: boolean
}

export function DeckView({ selectedIds, playPronunciation, isSpeechSupported }: DeckViewProps) {
  const { settings } = useSettingsContext()
  const { cards: scheduledCards } = useSchedulerContext()
  const { examples } = useVocabExamplesContext()
  const scheduledById = useMemo(
    () =>
      scheduledCards.reduce<Record<string, typeof scheduledCards[number]>>((acc, card) => {
        acc[card.id] = card
        return acc
      }, {}),
    [scheduledCards],
  )

  const selectedCards = selectedIds
    .map((id) => scheduledById[id])
    .filter((card): card is typeof scheduledCards[number] => !!card)

  const stateLabels: Record<SrsCardState, string> = {
    [SrsCardState.New]: 'New',
    [SrsCardState.Learning]: 'Learning',
    [SrsCardState.Review]: 'Review',
    [SrsCardState.Relearning]: 'Relearning',
  }

  const formatState = (scheduled?: typeof scheduledCards[number]) => {
    if (!scheduled) return '—'
    return stateLabels[scheduled.state] ?? '—'
  }

  const formatDue = (scheduled?: typeof scheduledCards[number]) => {
    if (!scheduled) return '—'
    const diffMs = scheduled.dueDate.getTime() - Date.now()
    if (diffMs <= 0) return 'Now'
    const diffMinutes = diffMs / 60000
    if (diffMinutes < 60) return `${Math.round(diffMinutes)}m`
    const diffHours = diffMinutes / 60
    if (diffHours < 24) return `${Math.round(diffHours)}h`
    const diffDays = diffHours / 24
    if (diffDays < 30) return `${Math.round(diffDays)}d`
    const diffMonths = diffDays / 30
    return `${Math.round(diffMonths)}mo`
  }

  const [sortColumn, setSortColumn] = useState<'rth' | 'opt' | 'character' | 'meaning' | 'state' | 'due'>('rth')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const showRthColumn = settings.debug || settings.orderMode === 'rth'
  const showOptColumn = settings.debug || settings.orderMode === 'opt'

  const sortedSelectedCards = useMemo(() => {
    const sorted = [...selectedCards]
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
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
          const stateA = a.state ?? SrsCardState.New
          const stateB = b.state ?? SrsCardState.New
          return (stateA - stateB) * directionMultiplier
        }
        case 'due': {
          const dueA = a.dueDate.getTime() ?? 0
          const dueB = b.dueDate.getTime() ?? 0
          return (dueA - dueB) * directionMultiplier
        }
        default:
          return 0
      }
    })
    return sorted
  }, [selectedCards, sortColumn, sortDirection])

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
      <section className="selected-panel">
        <div className="selected-header">
          <h2>Selected cards ({selectedCards.length})</h2>
        </div>
        {selectedCards.length === 0 ? (
          <p className="empty-hint">No cards yet. Add some to start practicing.</p>
        ) : (
          <div className="selected-table-wrapper">
            <table className="selected-table">
              <thead>
                <tr>
                  {showRthColumn && (
                    <th>
                      <button type="button" className="sort-button" onClick={() => handleSort('rth')}>
                        RTH # {renderSortIndicator('rth')}
                      </button>
                    </th>
                  )}
                  {showOptColumn && (
                    <th>
                      <button type="button" className="sort-button" onClick={() => handleSort('opt')}>
                        Opt RTH # {renderSortIndicator('opt')}
                      </button>
                    </th>
                  )}
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('character')}>
                      Character {renderSortIndicator('character')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-button" onClick={() => handleSort('meaning')}>
                      Keyword {renderSortIndicator('meaning')}
                    </button>
                  </th>
                  <th aria-label="Audio" />
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
                </tr>
              </thead>
              <tbody>
                {sortedSelectedCards.map((card) => {
                  return (
                    <tr key={card.id}>
                      {showRthColumn && <td>{card.rthOrder ?? '—'}</td>}
                      {showOptColumn && <td>{card.order ?? '—'}</td>}
                      <td className="selected-character">{card.character}</td>
                      <td>{card.meaning}</td>
                      <td>
                        <AudioButton
                          variant="small"
                          onClick={() =>
                            playPronunciation(buildPronunciationUtterance(card.character, examples))
                          }
                          disabled={!isSpeechSupported}
                          ariaLabel={`Play ${card.character}`}
                        />
                      </td>
                      <td>{formatState(card)}</td>
                      <td>{formatDue(card)}</td>
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
