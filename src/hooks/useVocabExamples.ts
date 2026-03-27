import { useEffect, useState } from 'react'
import { parseCsv } from '../utils/csv'

type VocabExamples = Record<string, string[]>

type VocabState = {
  examples: VocabExamples
  loading: boolean
  error: string | null
}

const buildExampleMap = (rows: Record<string, string>[]): VocabExamples => {
  return rows.reduce((acc, row) => {
    const firstColumnKey = Object.keys(row)[0]
    const character = firstColumnKey ? row[firstColumnKey]?.trim() : undefined
    if (!character) return acc
    const vocab = row['Vocab']?.trim()
    if (!acc[character]) acc[character] = []
    if (vocab) acc[character].push(vocab)
    return acc
  }, {} as VocabExamples)
}

export const useVocabExamples = (vocabCsvUrl: string) => {
  const [state, setState] = useState<VocabState>({
    examples: {},
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(vocabCsvUrl)
        if (!response.ok)
          throw new Error(`Failed to load vocab: ${response.status}`)
        const text = await response.text()
        const rows = parseCsv(text)
        const examples = buildExampleMap(rows)
        if (!cancelled) setState({ examples, loading: false, error: null })
      } catch (error) {
        if (!cancelled) {
          setState({
            examples: {},
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
  }, [vocabCsvUrl])

  return state
}
