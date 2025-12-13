import { useEffect, useState } from 'react'
import type { FlashcardDefinition } from '../data/cards'

const deckCsvUrl = new URL('../data/optimized_remembering_the_hanzi_rth_only.csv', import.meta.url)

type DeckState = {
  deck: FlashcardDefinition[]
  loading: boolean
  error: string | null
}

const splitCsvLine = (line: string) => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

const parseCsv = (text: string) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const headers = splitCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })

    return row
  })

  return rows
}

const buildDeck = (rows: Record<string, string>[]): FlashcardDefinition[] => {
  return rows
    .map((row) => {
      const order = Number(row['Opt RTH'])
      const character = row['TH']?.trim()
      const meaning = row['RTH Keyword']?.trim()
      const rthOrder = Number(row['RTH #'])

      if (!order || !character || !meaning) {
        return null
      }

      const id = `${order}-${character}`

      const card: FlashcardDefinition = {
        id,
        order,
        character,
        meaning,
        hanziWriterId: character,
      }

      if (Number.isFinite(rthOrder)) {
        card.rthOrder = rthOrder
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
