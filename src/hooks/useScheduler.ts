import { useEffect, useMemo, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating } from '../srs/types'
import {
  createSrsManager,
  createSrsManagerUseRef,
  type SchedulerCard,
  type SchedulerStats,
} from '../srs/createManager'
import { writeStoredState } from '../srs/storage'

export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = createSrsManagerUseRef(definitions)
  const [cards, setCards] = useState<SchedulerCard[]>(() => managerRef.current.getCards())
  const [heartbeat, setHeartbeat] = useState(() => Date.now())

  useEffect(() => {
    const manager = createSrsManager(definitions)
    managerRef.current = manager
    setCards(manager.getCards())
  }, [definitions])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeartbeat(Date.now())
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return
    const serialized = manager.getCards().map((card) => manager.serializeCard(card))
    writeStoredState(serialized)
  }, [cards])

  const getDueData = (stats: SchedulerStats) => {
    const manager = managerRef.current
    const dueDate = manager.getDueDate(stats)
    return dueDate.getTime()
  }

  const sorted = useMemo(
    () => [...cards].sort((a, b) => getDueData(a.stats) - getDueData(b.stats)),
    [cards],
  )

  const now = heartbeat
  const dueCount = cards.filter((card) => getDueData(card.stats) <= now).length
  const currentCard =
    sorted.find((card) => getDueData(card.stats) <= now) ?? sorted[0] ?? null

  const reviewCard = useCallback(
    (cardId: string, rating: ReviewRating) => {
      const manager = managerRef.current
      if (!manager) return
      const updated = manager.reviewCard(cardId, rating)
      setCards(updated)
      setHeartbeat(Date.now())
    },
    [],
  )

  const shouldShowOutline = useCallback(
    (cardId: string) => managerRef.current?.shouldShowOutline(cardId) ?? false,
    [],
  )

  const setOutlineLearned = useCallback(
    (cardId: string, learned: boolean) => {
      const manager = managerRef.current
      if (!manager) return
      manager.setOutlineLearned(cardId, learned)
      setCards(manager.getCards())
    },
    [],
  )

  return {
    cards,
    currentCard,
    totalCount: cards.length,
    dueCount,
    reviewCard,
    shouldShowOutline,
    setOutlineLearned,
  }
}
