import { useMemo, useState } from 'react'
import type { FlashcardDefinition } from '../types/cards'
import { useSettingsContext } from '../context/SettingsContext'
import { useParentModeContext } from '../context/ParentModeContext'
import { useVocabExamplesContext } from '../context/VocabExamplesContext'
import { SortableHeader } from './SortableHeader'
import { useSortableTable } from '../hooks/useSortableTable'

type LibraryViewProps = {
  deck: FlashcardDefinition[]
  selectedIds: string[]
  addCards: (ids: string[]) => void
  removeCard: (id: string) => void
}

type LibrarySortColumn = 'order' | 'character' | 'keyword' | 'example'

export function LibraryView({ deck, selectedIds, addCards, removeCard }: LibraryViewProps) {
  const { settings } = useSettingsContext()
  const { isUnlocked: parentModeUnlocked } = useParentModeContext()
  const { examples, loading, error } = useVocabExamplesContext()
  const [showAdded, setShowAdded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { sortColumn, sortDirection, handleSort } = useSortableTable<LibrarySortColumn>('order')
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const showRthColumn = settings.debug || settings.orderMode === 'rth'
  const showOptColumn = settings.debug || settings.orderMode === 'opt'

  const curatedDeck = useMemo(() => deck.filter((card) => Boolean(examples[card.character])), [deck, examples])

  const sortedLibrary = useMemo(() => {
    const byOrder = [...curatedDeck]
    byOrder.sort((a, b) => {
      switch (sortColumn) {
        case 'character':
          return a.character.localeCompare(b.character) * (sortDirection === 'asc' ? 1 : -1)
        case 'keyword':
          return a.meaning.localeCompare(b.meaning) * (sortDirection === 'asc' ? 1 : -1)
        case 'example': {
          const exampleA = examples[a.character]?.[0] ?? ''
          const exampleB = examples[b.character]?.[0] ?? ''
          return exampleA.localeCompare(exampleB) * (sortDirection === 'asc' ? 1 : -1)
        }
        case 'order':
        default: {
          const orderField = settings.orderMode === 'rth' ? 'rthOrder' : 'order'
          const valA = a[orderField] ?? Number.MAX_SAFE_INTEGER
          const valB = b[orderField] ?? Number.MAX_SAFE_INTEGER
          return (valA - valB) * (sortDirection === 'asc' ? 1 : -1)
        }
      }
    })
    return byOrder
  }, [curatedDeck, examples, settings.orderMode, sortColumn, sortDirection])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const visibleCards = useMemo(() => {
    const baseList = showAdded ? sortedLibrary : sortedLibrary.filter((card) => !selectedSet.has(card.id))
    if (!normalizedQuery) return baseList
    return baseList.filter((card) => {
      const rthNumber = (settings.orderMode === 'rth' ? card.rthOrder : card.order)?.toString() ?? ''
      const rthMatch = rthNumber.includes(normalizedQuery)
      const keywordMatch = card.meaning.toLowerCase().includes(normalizedQuery)
      const characterMatch = card.character.includes(searchQuery)
      const exampleMatch = examples[card.character]?.some((item) => item.toLowerCase().includes(normalizedQuery))
      return keywordMatch || characterMatch || !!exampleMatch || rthMatch
    })
  }, [examples, normalizedQuery, searchQuery, selectedSet, settings.orderMode, showAdded, sortedLibrary])

  if (!parentModeUnlocked) {
    return (
      <section className="manager-panel">
        <div className="manager-card">
          <p className="parent-mode-hint">Enable parent mode to add or remove cards from the deck.</p>
        </div>
      </section>
    )
  }

  const getExample = (character: string) => {
    const list = examples[character]
    return list?.[0] ?? ''
  }

  if (loading) {
    return (
      <section className="manager-panel">
        <div className="manager-card">
          <p>Loading curated characters…</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="manager-panel">
        <div className="manager-card">
          <p>Failed to load curated characters.</p>
          <p className="error-detail">{error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="manager-panel">
      <header className="manager-header library-header">
        <p className="tagline">Add or remove cards from deck.</p>
        <div className="library-controls-row">
          <input
            className="library-search"
            type="text"
            placeholder="Search by character, keyword, example, or RTH #"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <label className="library-toggle">
            <input type="checkbox" checked={showAdded} onChange={(event) => setShowAdded(event.target.checked)} />
            Show cards in deck
          </label>
        </div>
      </header>

      <section className="selected-panel">
        {visibleCards.length === 0 ? (
          <p className="empty-hint">No characters match this filter.</p>
        ) : (
          <div className="selected-table-wrapper">
            <table className="selected-table">
              <thead>
                <tr>
                  {showRthColumn && (
                    <SortableHeader column="order" label="RTH #" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  )}
                  {showOptColumn && (
                    <SortableHeader column="order" label="Opt RTH #" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  )}
                  <SortableHeader column="character" label="Character" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader column="keyword" label="Keyword" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader column="example" label="Example" currentColumn={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => {
                  const inDeck = selectedSet.has(card.id)
                  return (
                    <tr key={card.id}>
                      {showRthColumn && <td>{card.rthOrder ?? '—'}</td>}
                      {showOptColumn && <td>{card.order ?? '—'}</td>}
                      <td className="selected-character">{card.character}</td>
                      <td>{card.meaning}</td>
                      <td>{getExample(card.character)}</td>
                      <td>
                        {inDeck ? (
                          showAdded && (
                            <button className="selected-remove" onClick={() => removeCard(card.id)}>
                              Remove
                            </button>
                          )
                        ) : (
                          <button className="selected-add" onClick={() => addCards([card.id])}>
                            Add
                          </button>
                        )}
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
