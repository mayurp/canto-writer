export const buildPronunciationUtterance = (character: string, examples: Record<string, string[]>) => {
  const exampleClue = examples[character]?.[0]
  return exampleClue ? `${character}，${exampleClue}嘅${character}` : character
}
