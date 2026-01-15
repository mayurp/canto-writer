import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../models/db'
import { fsrsAlgorithm } from '../srs/fsrsAlgorithm'
import { SrsCardState } from '../srs/types'
import { isToday, startOfDay, addDays } from '../utils/date'


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
      dailyReviewedCards?.map((card) => card.cardId) ?? []

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

  const dueBuckets = useMemo(() => {
    if (!allSrsCards) return null

    const todayStart = startOfDay(new Date())
    const todayEnd = addDays(todayStart, 1)
    const tomorrowEnd = addDays(todayEnd, 1)
    const threeDayEnd = addDays(todayEnd, 3)
    const weekEnd = addDays(todayStart, 7)

    const buckets = {
      today: 0,      // today (calendar day)
      tomorrow: 0,   // tomorrow 
      threeDays: 0,  // < 3 days
      week: 0,       // 3-7days
      later: 0,
    }

    for (const card of allSrsCards) {
      if (!card.stats.due) continue

      const due = card.stats.due
      if (due < todayEnd) buckets.today++
      else if (due < tomorrowEnd) buckets.tomorrow++
      else if (due < threeDayEnd) buckets.threeDays++
      else if (due < weekEnd) buckets.week++
      else buckets.later++
    }

    return buckets
  }, [allSrsCards])

  return {
    dailyReviewedCards,
    summary,
    dueBuckets,
    isLoading: !allSrsCards,
  }
}
