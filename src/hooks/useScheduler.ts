import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating } from '../srs/types'
import { createSrsManager } from '../srs/createManager'
import { writeStoredState } from '../srs/storage'
import type { SrsDeckManager, ScheduledCard } from '../srs/SrsDeckManager'
import type { CardStats } from '../srs/fsrsAlgorithm'

export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = useRef<SrsDeckManager<CardStats>>(createSrsManager(definitions))
  const [cards, setCards] = useState<ScheduledCard<CardStats>[]>(() => managerRef.current.getCards())
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
    writeStoredState(manager.getCards())
  }, [cards])

  const sorted = useMemo(
    () => [...cards].sort((a, b) => a.stats.due.getTime() - b.stats.due.getTime()),
    [cards],
  )

  const now = heartbeat
  const dueCount = cards.filter((card) => card.stats.due.getTime() <= now).length
  const currentCard =
    sorted.find((card) => card.stats.due.getTime() <= now) ?? sorted[0] ?? null

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
