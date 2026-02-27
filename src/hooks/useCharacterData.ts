import { useState, useEffect } from 'react'
import { CharacterData } from '../utils/CharacterData'

// Use dynamic import URL resolution for Vite
const dictionaryUrl = new URL('../data/dictionary.jsonl', import.meta.url).href
const dictionaryOverridesUrl = new URL(
  '../data_generated/dictionary_overrides_auto.jsonl',
  import.meta.url,
).href
const rthListUrl = new URL(
  '../data/optimized_remembering_the_hanzi_rth_only.csv',
  import.meta.url,
).href
const componentKeywordsUrl = new URL(
  '../data_generated/hanzihero_component_keywords.jsonl',
  import.meta.url,
).href
const characterKeywordsUrl = new URL(
  '../data_generated/hanzihero_character_keywords.jsonl',
  import.meta.url,
).href
const componentVariantsUrl = new URL(
  '../data_generated/component_variants.json',
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
          overrideRes,
          rthRes,
          compKeywordsRes,
          charKeywordsRes,
          compVariantsRes,
          // No fetch for colors
        ] = await Promise.all([
          fetch(dictionaryUrl),
          fetch(dictionaryOverridesUrl),
          fetch(rthListUrl),
          fetch(componentKeywordsUrl),
          fetch(characterKeywordsUrl),
          fetch(componentVariantsUrl),
        ])

        if (!dictRes.ok)
          throw new Error(`Dictionary fetch failed: ${dictRes.statusText}`)

        // Optional files
        const overrideText = overrideRes.ok ? await overrideRes.text() : ''
        const rthText = rthRes.ok ? await rthRes.text() : ''
        const compKeywordsText = compKeywordsRes.ok
          ? await compKeywordsRes.text()
          : ''
        const charKeywordsText = charKeywordsRes.ok
          ? await charKeywordsRes.text()
          : ''
        const compVariantsText = compVariantsRes.ok
          ? await compVariantsRes.text()
          : ''

        const dictText = await dictRes.text()

        if (!isMounted) return

        const data = new CharacterData()
        data.parse(
          dictText,
          overrideText,
          rthText,
          compKeywordsText,
          charKeywordsText,
          compVariantsText,
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
