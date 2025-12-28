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
  const managerRef = useRef<SchedulerManager | null>(null)
  const [cards, setCards] = useState<SchedulerCard[]>([])
  const [heartbeat, setHeartbeat] = useState(() => Date.now())
  const storedCards = useLiveQuery(() => db.srsCards.toArray(), [], [])
  const cardInfoById = useMemo(() => {
    const manager = managerRef.current
    if (!manager) return {}
    return manager.getCards().reduce<Record<string, SchedulerCardInfo>>((acc, card) => {
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
    if (!managerRef.current) {
      managerRef.current = createSrsManager(definitions, storedCards)
    } else {
      managerRef.current.reset(definitions, storedCards)
    }
    setCards(managerRef.current.getCards())
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

  const persistUpdate = useCallback(
    (manager: SchedulerManager, updatedCards: SchedulerCard[], cardId: string) => {
      const updatedCard = updatedCards.find((card) => card.id === cardId)
      if (updatedCard) {
        void db.srsCards.put(manager.serializeCard(updatedCard))
      }
      setCards(updatedCards)
    },
    [],
  )

  const reviewCard = useCallback(
    (cardId: string, rating: ReviewRating) => {
      const manager = managerRef.current
      if (!manager) return
      const updated = manager.reviewCard(cardId, rating)
      persistUpdate(manager, updated, cardId)
      setHeartbeat(Date.now())
    },
    [persistUpdate],
  )

  const shouldShowOutline = useCallback(
    (cardId: string) => managerRef.current?.shouldShowOutline(cardId) ?? false,
    [],
  )

  const setOutlineLearned = useCallback(
    (cardId: string, learned: boolean) => {
      const manager = managerRef.current
      if (!manager) return
      const updated = manager.setOutlineLearned(cardId, learned)
      persistUpdate(manager, updated, cardId)
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
