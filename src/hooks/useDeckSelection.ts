import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import { db } from '../models/db'
import { DEFAULT_SELECTION_KEY } from '../models/DeckSelection'

const readSelection = async (): Promise<string[]> => {
  const record = await db.deckSelections.get(DEFAULT_SELECTION_KEY)
  return record?.selectedIds ?? []
}

const writeSelection = async (selectedIds: string[]) => {
  await db.deckSelections.put({ key: DEFAULT_SELECTION_KEY, selectedIds })
}

export const useDeckSelection = (deck: FlashcardDefinition[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const initializedRef = useRef(false)

  useEffect(() => {
    let mounted = true
    void readSelection()
      .then((ids) => {
        if (mounted && ids.length) {
          console.log('Loaded selection from DB', ids)
          setSelectedIds(ids)
        }
      })
      .catch((error) => {
        console.error('Failed to load deck selection', error)
      })
      .finally(() => {
        if (mounted) initializedRef.current = true
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!initializedRef.current) return
    void writeSelection(selectedIds).catch((error) => {
      console.error('Failed to save deck selection', error)
    })
  }, [selectedIds])

  useEffect(() => {
    const validSet = new Set(deck.map((card) => card.id))
    setSelectedIds((prev) => prev.filter((id) => validSet.has(id)))
  }, [deck])

  // TODO: remove this automatic selection once debugging is done.
  // useEffect(() => {
  //   if (!deck.length) return
  //   setSelectedIds((prev) => {
  //     if (prev.length) return prev
  //     const initial = deck.slice(0, 10).map((card) => card.id)
  //     return initial
  //   })
  // }, [deck])
  //

  const addCards = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return Array.from(next)
    })
  }, [])

  const removeCard = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((existing) => existing !== id))
  }, [])

  const clearAll = useCallback(() => {
    setSelectedIds([])
  }, [])

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
