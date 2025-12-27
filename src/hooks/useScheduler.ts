import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating } from '../srs/types'
import {
  createSrsManager,
  type SchedulerCard,
  type SchedulerStats,
  type SchedulerManager,
} from '../srs/createManager'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'
import type { SrsCardState } from '../srs/SrsDeckManager'

export type SchedulerCardInfo = {
  state: SrsCardState
  dueDate: Date
  stability: number
}

export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = useRef<SchedulerManager | null>(null)
  const hydratingRef = useRef(false)
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
    hydratingRef.current = true
    const manager = createSrsManager(definitions, storedCards)
    managerRef.current = manager
    setCards(manager.getCards())
  }, [definitions, storedCards])

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
    if (hydratingRef.current) {
      hydratingRef.current = false
      return
    }
    const serialized = manager.getCards().map((card) => manager.serializeCard(card))
    void db.srsCards.bulkPut(serialized)
  }, [cards])

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
    cardInfoById,
  }
}
