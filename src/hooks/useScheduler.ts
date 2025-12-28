import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating, SrsCardState } from '../srs/types'
import {
  createSrsManager,
  type SchedulerCard,
  type SchedulerStats,
  type SchedulerManager,
} from '../srs/createManager'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'


export type SchedulerCardInfo = {
  state: SrsCardState
  dueDate: Date
  stability: number
}

export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = useRef<SchedulerManager>(createSrsManager())
  const [cards, setCards] = useState<SchedulerCard[]>([])
  const [heartbeat, setHeartbeat] = useState(() => Date.now())
  const storedCards = useLiveQuery(() => db.srsCards.toArray(), [], [])
  const cardInfoById = useMemo(() => {
    const manager = managerRef.current
    return cards.reduce<Record<string, SchedulerCardInfo>>((acc, card) => {
      acc[card.id] = {
        state: manager.getState(card.stats),
        dueDate: manager.getDueDate(card.stats),
        stability: manager.getStability(card.stats),
      }
      return acc
    }, {})
  }, [cards])

  useEffect(() => {
    if (!storedCards) return
    const manager = managerRef.current
    setCards(manager.hydrate(definitions, storedCards))
  }, [definitions, storedCards])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeartbeat(Date.now())
    }, 15000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const getDueData = (stats: SchedulerStats) => {
    const manager = managerRef.current
    if (!manager) return Number.POSITIVE_INFINITY
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

  const persistUpdate = useCallback((manager: SchedulerManager, updatedCards: SchedulerCard[], cardId: string) => {
    const updatedCard = updatedCards.find((card) => card.id === cardId)
    if (updatedCard) {
      void db.srsCards.put(manager.serializeCard(updatedCard))
    }
  }, [])

  const reviewCard = useCallback(
    (cardId: string, rating: ReviewRating) => {
      const manager = managerRef.current
      setCards((prev) => {
        const updated = manager.reviewCard(prev, cardId, rating)
        persistUpdate(manager, updated, cardId)
        return updated
      })
      setHeartbeat(Date.now())
    },
    [persistUpdate],
  )

  const shouldShowOutline = useCallback(
    (cardId: string) => managerRef.current.shouldShowOutline(cards, cardId),
    [cards],
  )

  const setOutlineLearned = useCallback(
    (cardId: string, learned: boolean) => {
      const manager = managerRef.current
      setCards((prev) => {
        const updated = manager.setOutlineLearned(prev, cardId, learned)
        persistUpdate(manager, updated, cardId)
        return updated
      })
    },
    [persistUpdate],
  )

  return {
    cards,
    currentCard,
    totalCount: cards.length,
    dueCount,
    reviewCard,
    shouldShowOutline,
    setOutlineLearned,
    cardInfoById,
  }
}
