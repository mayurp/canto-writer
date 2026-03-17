import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FlashcardDefinition } from '../types/cards'
import type { GradingInfo } from '../srs/types'
import {
  createSrsManager,
  type SchedulerCard,
  type SchedulerManager,
} from '../srs/createManager'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'
import { endOfDay } from '../utils/date'

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
  // Don't use heartbeat here as the timestamp is after the date
  // given by hydrate to New cards (which don't have srs records).
  const due = sorted.filter((card) => card.dueDate <= endOfDay(new Date()))
  const dueCount = due.length
  const currentCard = due[0] ?? null
  const nextDueDate =
    dueCount === 0
      ? (sorted[0]?.dueDate ?? null)
      : (currentCard?.dueDate ?? null)

  // Ref always holds the latest cards so callbacks below never operate on
  // stale data — regardless of when their closures were captured. This
  // prevents the production bug where useLiveQuery fires between card
  // capture and Next click, causing gradeCard to silently operate on an
  // old cards array.
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const gradeCard = useCallback(
    (cardId: string, grading: GradingInfo) => {
      const manager = managerRef.current
      const newCards = manager.gradeCard(cardsRef.current, cardId, grading)
      const updatedCard = newCards.find((card) => card.id === cardId)
      if (updatedCard) {
        void db.srsCards.put(manager.serializeCard(updatedCard))
      }
      setCards(newCards)
      setHeartbeat(Date.now())
    },
    [], // cardsRef.current is always fresh — no dep needed
  )

  const shouldShowOutline = useCallback(
    (cardId: string) =>
      managerRef.current.shouldShowOutline(cardsRef.current, cardId),
    [], // same — reads via ref
  )

  return {
    cards,
    currentCard,
    totalCount: cards.length,
    dueCount,
    nextDueDate,
    gradeCard,
    shouldShowOutline,
  }
}
