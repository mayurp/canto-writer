import { useState, useEffect } from 'react'
import { CharacterData } from '../utils/CharacterData'

// Use dynamic import URL resolution for Vite
const dictionaryUrl = new URL(
  '../data_generated/dictionary_all.jsonl',
  import.meta.url,
).href
const rthListUrl = new URL(
  '../data/optimized_remembering_the_hanzi_rth_only.csv',
  import.meta.url,
).href
const componentKeywordsUrl = new URL(
  '../data_generated/hanzi_hero_component_decomposition.jsonl',
  import.meta.url,
).href
const characterKeywordsUrl = new URL(
  '../data_generated/hanzi_hero_character_decomposition.jsonl',
  import.meta.url,
).href

import { ComponentColors } from '../data/ComponentColors'

export function useCharacterData() {
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        const [
          dictRes,
          rthRes,
          compKeywordsRes,
          charKeywordsRes,
          // No fetch for colors
        ] = await Promise.all([
          fetch(dictionaryUrl),
          fetch(rthListUrl),
          fetch(componentKeywordsUrl),
          fetch(characterKeywordsUrl),
        ])

        if (!dictRes.ok)
          throw new Error(`Dictionary fetch failed: ${dictRes.statusText}`)

        // Optional files
        const rthText = rthRes.ok ? await rthRes.text() : ''
        const compKeywordsText = compKeywordsRes.ok
          ? await compKeywordsRes.text()
          : ''
        const charKeywordsText = charKeywordsRes.ok
          ? await charKeywordsRes.text()
          : ''

        const dictText = await dictRes.text()

        if (!isMounted) return

        const data = new CharacterData()
        data.parse(
          dictText,
          rthText,
          compKeywordsText,
          charKeywordsText,
          ComponentColors,
        )

        setCharacterData(data)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load character data:', err)
        setError(
          err instanceof Error
            ? err
            : new Error('Unknown error loading dictionary'),
        )
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  return { characterData, loading, error }
}
