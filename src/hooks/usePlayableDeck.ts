import { useMemo } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { OrderMode } from './useSettings'

export const usePlayableDeck = (
  deck: FlashcardDefinition[],
  selectedIds: string[],
  orderMode: OrderMode,
) => {
  const orderedDeck = useMemo(() => {
    if (!deck.length) return deck
    if (orderMode === 'rth') {
      return [...deck].sort((a, b) => a.rthOrder - b.rthOrder)
    }
    else {
      return [...deck].sort((a, b) => a.order - b.order)
    }
  }, [deck, orderMode])

  const playableDeck = useMemo(() => {
    if (!selectedIds.length) return []
    const allowed = new Set(selectedIds)
    return orderedDeck.filter((card) => allowed.has(card.id))
  }, [orderedDeck, selectedIds])

  return { playableDeck }
}
