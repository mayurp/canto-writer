declare module 'hanzi-writer' {
  type WriterOptions = {
    width?: number
    height?: number
    showOutline?: boolean
    padding?: number
    strokeColor?: string
    radicalColor?: string
    delayBetweenStrokes?: number
    delayBetweenLoops?: number
  }

  type StrokePoint = {
    x: number
    y: number
  }

  type StrokeData = {
    character: string
    drawnPath: {
      pathString: string
      points: StrokePoint[]
    }
    isBackwards: boolean
    strokeNum: number
    mistakesOnStroke: number
    totalMistakes: number
    strokesRemaining: number
  }

  type QuizSummary = {
    character: string
    totalMistakes: number
    totalStrokes: number
    totalCorrectStrokes: number
  }

  type QuizOptions = {
    onCorrectStroke?: (stroke: StrokeData) => void
    onComplete?: (summary: QuizSummary) => void
  }

  type CharacterStrokeData = {
    path: string
    points: [number, number][]
  }

  type CharacterData = {
    strokes: CharacterStrokeData[]
  }

  class HanziWriter {
    static loadCharacterData?: (character: string) => Promise<CharacterData>

    static create(element: HTMLElement, character: string, options?: WriterOptions): HanziWriter
    loopCharacterAnimation(): void
    pauseAnimation(): void
    quiz(options?: QuizOptions): void
    hideCharacter(): void
    showCharacter(): void
    getCharacterData(): Promise<CharacterData>
  }

  export default HanziWriter
  export type { StrokeData, QuizSummary }
}
