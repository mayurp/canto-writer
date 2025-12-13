import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'

const STORAGE_KEY = 'canto-writer.deck-selection'

export const useDeckSelection = (deck: FlashcardDefinition[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
  }, [selectedIds])

  useEffect(() => {
    const validSet = new Set(deck.map((card) => card.id))
    setSelectedIds((prev) => prev.filter((id) => validSet.has(id)))
  }, [deck])

  // TODO: remove this automatic selection once debugging is done.
  useEffect(() => {
    if (!deck.length) return
    setSelectedIds((prev) => {
      if (prev.length) return prev
      const initial = deck.slice(0, 10).map((card) => card.id)
      return initial
    })
  }, [deck])
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
