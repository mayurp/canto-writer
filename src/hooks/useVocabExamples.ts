import { useEffect, useState } from 'react'

const vocabCsvUrl = new URL('../data/vocab_examples.csv', import.meta.url)

type VocabExamples = Record<string, string[]>

type VocabState = {
  examples: VocabExamples
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
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })

    return row
  })
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
