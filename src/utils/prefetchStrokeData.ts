import HanziWriter from 'hanzi-writer'

const prefetched = new Set<string>()

const fetchStrokeData = (character: string) =>
  (HanziWriter.loadCharacterData?.(character) ??
    Promise.reject(new Error('loadCharacterData is not defined on HanziWriter'))
  ).catch((error) => {
    console.warn(`Failed to prefetch stroke data for ${character}`, error)
  })

export const prefetchStrokeData = (characters: string[]) => {
  characters.forEach((character) => {
    if (prefetched.has(character)) return
    prefetched.add(character)
    void fetchStrokeData(character)
  })
}
