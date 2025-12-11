import { useEffect, useMemo, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

type CardStats = {
  interval: number // minutes between reviews
  ease: number
  nextReview: number
}

export type ScheduledCard = FlashcardDefinition & {
  stats: CardStats
}

const STORAGE_KEY = 'canto-writer.deck-state'

const defaultStats = (): CardStats => ({
  interval: 0,
  ease: 2.5,
  nextReview: Date.now(),
})

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const hydrateDeck = (definitions: FlashcardDefinition[]): ScheduledCard[] => {
  if (typeof window === 'undefined') {
    return definitions.map((card) => ({ ...card, stats: defaultStats() }))
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return definitions.map((card) => ({ ...card, stats: defaultStats() }))
    }

    const parsed: ScheduledCard[] = JSON.parse(stored)

    return definitions.map((card) => {
      const saved = parsed.find((entry) => entry.id === card.id)
      return {
        ...card,
        stats: saved?.stats ?? defaultStats(),
      }
    })
  } catch {
    return definitions.map((card) => ({ ...card, stats: defaultStats() }))
  }
}

const computeNextStats = (stats: CardStats, rating: ReviewRating): CardStats => {
  const easeAdjustments: Record<ReviewRating, number> = {
    again: -0.3,
    hard: -0.15,
    good: 0,
    easy: 0.15,
  }

  const now = Date.now()
  const nextEase = clamp(stats.ease + easeAdjustments[rating], 1.3, 3.0)

  let nextInterval: number

  if (rating === 'again') {
    nextInterval = 0.5
  } else if (stats.interval === 0) {
    nextInterval = rating === 'easy' ? 2 : 1
  } else if (rating === 'hard') {
    nextInterval = stats.interval * 0.8
  } else if (rating === 'good') {
    nextInterval = stats.interval * nextEase
  } else {
    nextInterval = stats.interval * (nextEase + 0.5)
  }

  const minutes = Math.max(0.5, nextInterval)

  return {
    interval: minutes,
    ease: nextEase,
    nextReview: now + minutes * 60 * 1000,
  }
}

export const useScheduler = (definitions: FlashcardDefinition[]) => {
  const [cards, setCards] = useState<ScheduledCard[]>(() => hydrateDeck(definitions))
  const [heartbeat, setHeartbeat] = useState(() => Date.now())

  useEffect(() => {
    setCards(hydrateDeck(definitions))
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
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  }, [cards])

  const sorted = useMemo(
    () => [...cards].sort((a, b) => a.stats.nextReview - b.stats.nextReview),
    [cards],
  )

  const now = heartbeat
  const dueCount = cards.filter((card) => card.stats.nextReview <= now).length
  const currentCard =
    sorted.find((card) => card.stats.nextReview <= now) ?? sorted[0] ?? null

  const reviewCard = (cardId: string, rating: ReviewRating) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? {
              ...card,
              stats: computeNextStats(card.stats, rating),
            }
          : card,
      ),
    )
    setHeartbeat(Date.now())
  }

  return {
    cards,
    currentCard,
    totalCount: cards.length,
    dueCount,
    reviewCard,
  }
}
