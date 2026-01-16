import { useEffect, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'
import { parseCsv } from '../utils/csv'

const deckCsvUrl = new URL('../data/optimized_remembering_the_hanzi_rth_only.csv', import.meta.url)

type DeckState = {
  deck: FlashcardDefinition[]
  loading: boolean
  error: string | null
}

const buildDeck = (rows: Record<string, string>[]): FlashcardDefinition[] => {
  return rows
    .map((row) => {
      const order = Number(row['Opt RTH'])
      const character = row['TH']?.trim()
      const meaning = row['RTH Keyword']?.trim()
      const rthOrder = Number(row['RTH #'])
      const story = row['Story']

      if (!order || !rthOrder || !character || !meaning) {
        return null
      }

      const id = character

      const card: FlashcardDefinition = {
        id,
        order,
        rthOrder,
        character,
        meaning,
        story
      }

      return card
    })
    .filter((card): card is FlashcardDefinition => card !== null)
    .sort((a, b) => a.order - b.order)
}

export const useRememberingDeck = () => {
  const [state, setState] = useState<DeckState>({
    deck: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(deckCsvUrl)
        if (!response.ok) {
          throw new Error(`Failed to load deck: ${response.status}`)
        }
        const text = await response.text()
        const rows = parseCsv(text)
        const deck = buildDeck(rows)

        if (!cancelled) {
          setState({ deck, loading: false, error: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            deck: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
