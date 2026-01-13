import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../models/db'
import { fsrsAlgorithm } from '../srs/fsrsAlgorithm'
import { SrsCardState } from '../srs/types'

// Helper function to check if a date falls on the current calendar day
const isToday = (someDate: Date): boolean => {
  const today = new Date()
  return (
    someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear()
  )
}

export const useStats = () => {
  const storedCards = useLiveQuery(() => db.srsCards.toArray(), [], [])

  // Note that ts-fsrs data types are relied on for stats here
  // This is inconsistent with SrsDeckManager which attempts to hide the 
  // details of the algorithm used from the rest of the app.
  // TODO: consider a better abstraction to conver the use case in this
  // file or remove the abstraction from SrsDeckManager and just use
  // fsrs directly everywhere.
  const allSrsCards = storedCards.map((card) => ({
    ...card,
    stats: fsrsAlgorithm.deserializeStats(card.stats)
  }))

  const dailyReviewedCards = useMemo(() => {
    if (!allSrsCards) return []
    return allSrsCards.filter((card) => {
      return card.stats.last_review && isToday(card.stats.last_review)
    })
  }, [allSrsCards])

  const summary = useMemo(() => {
    const reviewsToday = dailyReviewedCards?.length ?? 0

    const twelveHoursFromNow = new Date()
    twelveHoursFromNow.setHours(twelveHoursFromNow.getHours() + 12)

    const charactersToday =
      dailyReviewedCards?.filter((card) => {
        return card.stats.due > twelveHoursFromNow
      }).length ?? 0

    const reviewedCharacters =
      dailyReviewedCards?.map((card) => card.cardId) ?? [] // cardId is character

    const reviewsAllTime =
      allSrsCards?.reduce((acc, card) => acc + card.stats.reps, 0) ?? 0

    const charactersAllTime = allSrsCards?.length ?? 0

    const charactersLearned =
      allSrsCards?.filter((card) => fsrsAlgorithm.getState(card.stats) == SrsCardState.Review).length ?? 0

    return {
      reviewsToday,
      charactersToday,
      reviewedCharacters: Array.from(new Set(reviewedCharacters)), // Unique characters
      reviewsAllTime,
      charactersAllTime,
      charactersLearned,
    }
  }, [dailyReviewedCards, allSrsCards])

  return {
    dailyReviewedCards,
    summary,
    isLoading: !allSrsCards,
  }
}
