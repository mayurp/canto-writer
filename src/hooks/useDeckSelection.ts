import { useCallback, useMemo } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import { db } from '../models/db'
import { DEFAULT_SELECTION_KEY } from '../models/DeckSelection'
import { useLiveQuery } from 'dexie-react-hooks'

const writeSelection = async (selectedIds: string[]) => {
  await db.deckSelections.put({ key: DEFAULT_SELECTION_KEY, selectedIds })
}

export const useDeckSelection = (deck: FlashcardDefinition[]) => {
  const selectionRecord = useLiveQuery(
    () => db.deckSelections.get(DEFAULT_SELECTION_KEY),
    [],
    null,
  )
  const selectedIds = selectionRecord?.selectedIds ?? []

  const updateSelection = useCallback((updater: (prev: string[]) => string[]) => {
    const next = updater(selectedIds)
    void writeSelection(next).catch((error) => {
      console.error('Failed to save deck selection', error)
    })
  }, [selectedIds])

  const addCards = useCallback((ids: string[]) => {
    const additions = new Set(ids)
    updateSelection((prev) => Array.from(new Set([...prev, ...additions])))
  }, [updateSelection])

  const removeCard = useCallback((id: string) => {
    updateSelection((prev) => prev.filter((existing) => existing !== id))
  }, [updateSelection])

  const clearAll = useCallback(() => {
    updateSelection(() => [])
  }, [updateSelection])

  const activeDeck = useMemo(
    () => deck.filter((card) => selectedIds.includes(card.id)),
    [deck, selectedIds],
  )

  return {
    selectedIds,
    activeDeck,
    addCards,
    removeCard,
    clearAll,
  }
}
