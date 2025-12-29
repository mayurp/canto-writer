import { useMemo } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { OrderMode } from './useSettings'

export const usePlayableDeck = (
  deck: FlashcardDefinition[],
  orderMode: OrderMode,
  selectedIds: string[],
) => {
  const orderedDeck = useMemo(() => {
    if (!deck.length) return deck
    if (orderMode === 'rth') {
      return [...deck].sort((a, b) => {
        const aOrder = a.rthOrder ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.rthOrder ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })
    }
    return [...deck].sort((a, b) => a.order - b.order)
  }, [deck, orderMode])

  const playableDeck = useMemo(() => {
    if (!selectedIds.length) return []
    const allowed = new Set(selectedIds)
    return orderedDeck.filter((card) => allowed.has(card.id))
  }, [orderedDeck, selectedIds])

  return { orderedDeck, playableDeck }
}
