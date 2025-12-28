import type { FlashcardDefinition } from '../data/cards'
import { SrsCardState, type GradingInfo, type ReviewRating } from './types'
import type { SrsCard, SrsCardRecord } from '../models/SrsCard'

export type SrsAlgorithm<Stats> = {
  defaultStats: () => Stats
  computeNextStats: (stats: Stats, rating: ReviewRating) => Stats
  deserializeStats: (raw: unknown) => Stats
  getState: (stats: Stats) => SrsCardState
  getDueDate: (stats: Stats) => Date
  getStability: (stats: Stats) => number
}

export type ScheduledCard<Stats> = FlashcardDefinition &
  SrsCard & {
    stats: Stats
    // Fields derived from stats
    state: SrsCardState
    dueDate: Date
    stability: number
  }

export class SrsDeckManager<Stats> {
  private algorithm: SrsAlgorithm<Stats>

  constructor(algorithm: SrsAlgorithm<Stats>) {
    this.algorithm = algorithm
  }

  hydrate(definitions: FlashcardDefinition[], storedCards?: SrsCardRecord[]): ScheduledCard<Stats>[] {
    return definitions.map((card) => {
      const saved = storedCards?.find((entry) => entry.id === card.id)
      const stats =
        saved?.stats !== undefined ? this.algorithm.deserializeStats(saved.stats) : this.algorithm.defaultStats()
      return {
        ...card,
        stats,
        learnedOutline: saved?.learnedOutline ?? false,
        state: this.algorithm.getState(stats),
        dueDate: this.algorithm.getDueDate(stats),
        stability: this.algorithm.getStability(stats),
      }
    })
  }

  gradeCard(cards: ScheduledCard<Stats>[], cardId: string, grading: GradingInfo) {
    return cards.map((card) => {
      if (card.id !== cardId) return card
      const stats = this.algorithm.computeNextStats(card.stats, grading.rating)
      return {
        ...card,
        stats,
        learnedOutline: grading.learnedOutline,
        state: this.algorithm.getState(stats),
        dueDate: this.algorithm.getDueDate(stats),
        stability: this.algorithm.getStability(stats),
      }
    })
  }

  shouldShowOutline(cards: ScheduledCard<Stats>[], cardId: string): boolean {
    const card = cards.find((entry) => entry.id === cardId)
    if (!card) {
      return true
    }
    const state = this.getState(card.stats)
    const needsGuidedState =
      state === SrsCardState.New ||
      state === SrsCardState.Learning ||
      state === SrsCardState.Relearning
    return needsGuidedState && !card.learnedOutline
  }

  getState(stats: Stats) {
    return this.algorithm.getState(stats)
  }

  getDueDate(stats: Stats) {
    return this.algorithm.getDueDate(stats)
  }

  getStability(stats: Stats) {
    return this.algorithm.getStability(stats)
  }

  serializeCard(card: ScheduledCard<Stats>): SrsCardRecord {
    return {
      id: card.id,
      stats: card.stats,
      learnedOutline: card.learnedOutline,
    }
  }
}
