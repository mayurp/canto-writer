import './styles/DeckView.css'
import { useMemo } from 'react'
import { useSettingsContext } from '../context/SettingsContext'
import { SrsCardState } from '../srs/types'
import { useSchedulerContext } from '../context/SchedulerContext'
import { useVocabExamplesContext } from '../context/VocabExamplesContext'
import { buildPronunciationUtterance } from '../utils/pronunciation'
import { AudioButton } from './AudioButton'
import { SortableHeader } from './SortableHeader'
import { useSortableTable } from '../hooks/useSortableTable'

type DeckViewProps = {
  selectedIds: string[]
  playPronunciation: (text: string) => void
  isSpeechSupported: boolean
}

type DeckSortColumn = 'rth' | 'opt' | 'character' | 'meaning' | 'state' | 'due'

export function DeckView({ selectedIds, playPronunciation, isSpeechSupported }: DeckViewProps) {
  const { settings } = useSettingsContext()
  const { cards: scheduledCards } = useSchedulerContext()
  const { examples } = useVocabExamplesContext()
  const { sortColumn, sortDirection, handleSort } = useSortableTable<DeckSortColumn>('rth')

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
                    <SortableHeader column="rth" label="RTH #" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  )}
                  {showOptColumn && (
                    <SortableHeader column="opt" label="Opt RTH #" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  )}
                  <SortableHeader column="character" label="Character" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader column="meaning" label="Keyword" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <th aria-label="Audio" />
                  <SortableHeader column="state" label="SRS state" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader column="due" label="Due" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
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
