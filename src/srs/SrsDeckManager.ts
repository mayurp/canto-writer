import type { FlashcardDefinition } from '../data/cards'
import type { ReviewRating } from './types'

export type SrsAlgorithm<Stats> = {
  defaultStats: () => Stats
  computeNextStats: (stats: Stats, rating: ReviewRating) => Stats
  shouldShowOutline: (stats: Stats) => boolean
  deserializeStats?: (raw: unknown) => Stats
}

export type ScheduledCard<Stats = unknown> = FlashcardDefinition & {
  stats: Stats
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

  shouldShowOutline(cardId: string): boolean {
    const card = this.cards.find((entry) => entry.id === cardId)
    if (!card) {
      return true
    }
    return this.algorithm.shouldShowOutline(card.stats)
  }
}
