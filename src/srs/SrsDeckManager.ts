import type { FlashcardDefinition } from '../data/cards'
import { SrsCardState, type ReviewRating } from './types'
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
  }

export class SrsDeckManager<Stats> {
  private cards: ScheduledCard<Stats>[]
  private algorithm: SrsAlgorithm<Stats>

  constructor(
    definitions: FlashcardDefinition[],
    algorithm: SrsAlgorithm<Stats>,
    storedCards?: SrsCardRecord[],
  ) {
    this.algorithm = algorithm
    this.cards = this.hydrate(definitions, storedCards)
  }

  private hydrate(
    definitions: FlashcardDefinition[],
    storedCards?: SrsCardRecord[],
  ): ScheduledCard<Stats>[] {
    return definitions.map((card) => {
      const saved = storedCards?.find((entry) => entry.id === card.id)
      return {
        ...card,
        stats: saved?.stats !== undefined ? this.algorithm.deserializeStats(saved.stats) : this.algorithm.defaultStats(),
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
    return this.cards
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

  serializeCard(card: ScheduledCard<Stats>): SrsCardRecord {
    return {
      id: card.id,
      stats: card.stats,
      learnedOutline: card.learnedOutline,
    }
  }

  reset(definitions: FlashcardDefinition[], storedCards?: SrsCardRecord[]) {
    this.cards = this.hydrate(definitions, storedCards)
  }
}
