import { useEffect, useState } from 'react'
import { parseCsv } from '../utils/csv'

const vocabCsvUrl = new URL('../data/vocab_examples.csv', import.meta.url)

type VocabExamples = Record<string, string[]>

type VocabState = {
  examples: VocabExamples
  loading: boolean
  error: string | null
}

const buildExampleMap = (rows: Record<string, string>[]): VocabExamples => {
  return rows.reduce((acc, row) => {
    const character = row['TH']?.trim()
    const vocab = row['Vocab']?.trim()
    if (!character || !vocab) return acc

    if (!acc[character]) acc[character] = []
    acc[character].push(vocab)
    return acc
  }, {} as VocabExamples)
}

export const useVocabExamples = () => {
  const [state, setState] = useState<VocabState>({ examples: {}, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(vocabCsvUrl)
        if (!response.ok) throw new Error(`Failed to load vocab: ${response.status}`)
        const text = await response.text()
        const rows = parseCsv(text)
        const examples = buildExampleMap(rows)
        if (!cancelled) setState({ examples, loading: false, error: null })
      } catch (error) {
        if (!cancelled) {
          setState({ examples: {}, loading: false, error: error instanceof Error ? error.message : 'Unknown error' })
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
