import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import type { GradingInfo } from '../srs/types'
import { createSrsManager, type SchedulerCard, type SchedulerManager } from '../srs/createManager'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'


export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const managerRef = useRef<SchedulerManager>(createSrsManager())
  const storedCards = useLiveQuery(() => db.srsCards.toArray(), [], [])
  const [cards, setCards] = useState<SchedulerCard[]>([])
  // heartbeat is not used explicitly, but triggers a re-render periodically.
  // TODO: check if we should be doing something more efficient here.
  const [, setHeartbeat] = useState(() => Date.now())

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
  // Don't use hearbeat here as the timestamp is after the date
  // given by hydrate to New cards (which don't have srs records).
  const now = Date.now()
  const dueCount = cards.filter((card) => getDueTimestamp(card) <= now).length
  const currentCard = sorted.find((card) => getDueTimestamp(card) <= now) ?? sorted[0] ?? null

  const gradeCard = useCallback(
    (cardId: string, grading: GradingInfo) => {
      const manager = managerRef.current
      const newCards = manager.gradeCard(cards, cardId, grading)
      const updatedCard = newCards.find((card) => card.id === cardId)
      if (updatedCard) {
        void db.srsCards.put(manager.serializeCard(updatedCard))
      }
      setCards(newCards)
      setHeartbeat(Date.now())
    },
    [cards],
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
