import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { GradingInfo } from '../srs/types'
import { createSrsManager, type SchedulerCard, type SchedulerManager } from '../srs/createManager'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'


export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = useRef<SchedulerManager>(createSrsManager())
  const [cards, setCards] = useState<SchedulerCard[]>([])
  const [heartbeat, setHeartbeat] = useState(() => Date.now())
  const storedCards = useLiveQuery(() => db.srsCards.toArray(), [], [])

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

  const getDueTimestamp = (card: SchedulerCard) => card.dueDate.getTime()

  const sorted = useMemo(
    () => [...cards].sort((a, b) => getDueTimestamp(a) - getDueTimestamp(b)),
    [cards],
  )

  const now = heartbeat
  const dueCount = cards.filter((card) => getDueTimestamp(card) <= now).length
  const currentCard = sorted.find((card) => getDueTimestamp(card) <= now) ?? sorted[0] ?? null

  const persistUpdate = useCallback((manager: SchedulerManager, updatedCards: SchedulerCard[], cardId: string) => {
    const updatedCard = updatedCards.find((card) => card.id === cardId)
    if (updatedCard) {
      void db.srsCards.put(manager.serializeCard(updatedCard))
    }
  }, [])

  const gradeCard = useCallback(
    (cardId: string, grading: GradingInfo) => {
      const manager = managerRef.current
      const updated = manager.gradeCard(cards, cardId, grading)
      persistUpdate(manager, updated, cardId)
      setCards(updated)
      setHeartbeat(Date.now())
    },
    [cards, persistUpdate],
  )

  const shouldShowOutline = useCallback(
    (cardId: string) => managerRef.current.shouldShowOutline(cards, cardId),
    [cards],
  )

  return {
    cards,
    currentCard,
    totalCount: cards.length,
    dueCount,
    gradeCard,
    shouldShowOutline,
  }
}
