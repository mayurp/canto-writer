import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating } from './types'


export const SrsCardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const

export type SrsCardState = (typeof SrsCardState)[keyof typeof SrsCardState]

export type SrsAlgorithm<Stats> = {
  defaultStats: () => Stats
  computeNextStats: (stats: Stats, rating: ReviewRating) => Stats
  deserializeStats?: (raw: unknown) => Stats
  getState: (stats: Stats) => SrsCardState
  getDueDate: (stats: Stats) => Date
  getStability: (stats: Stats) => number
}

export type ScheduledCard<Stats> = FlashcardDefinition & {
  stats: Stats
  learnedOutline: boolean
}

export class SrsDeckManager<Stats> {
  private cards: ScheduledCard<Stats>[]
  private algorithm: SrsAlgorithm<Stats>

  constructor(
    definitions: FlashcardDefinition[],
    algorithm: SrsAlgorithm<Stats>,
    storedCards?: ScheduledCard<Stats>[],
  ) {
    this.algorithm = algorithm
    this.cards = this.hydrate(definitions, storedCards)
  }

  private hydrate(
    definitions: FlashcardDefinition[],
    storedCards?: ScheduledCard<Stats>[],
  ): ScheduledCard<Stats>[] {
    return definitions.map((card) => {
      const saved = storedCards?.find((entry) => entry.id === card.id)
      return {
        ...card,
        stats: saved?.stats
          ? this.algorithm.deserializeStats
            ? this.algorithm.deserializeStats(saved.stats)
            : (saved.stats as Stats)
          : this.algorithm.defaultStats(),
        learnedOutline: saved?.learnedOutline ?? false,
      }
    })
  }

  getCards() {
    return this.cards
  }

  reviewCard(cardId: string, rating: ReviewRating) {
    this.cards = this.cards.map((card) => {
      if (card.id !== cardId) return card
      return {
        ...card,
        stats: this.algorithm.computeNextStats(card.stats, rating),
      }
    })
    return this.cards
  }

  setOutlineLearned(cardId: string, learned: boolean) {
    this.cards = this.cards.map((card) => {
      if (card.id !== cardId) return card
      return {
        ...card,
        learnedOutline: learned,
      }
    })
  }

  shouldShowOutline(cardId: string): boolean {
    const card = this.cards.find((entry) => entry.id === cardId)
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
}
