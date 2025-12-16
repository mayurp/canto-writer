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

  type QuizOptions = {
    onCorrectStroke?: (stroke: StrokeData) => void
    onComplete?: () => void
  }

  class HanziWriter {
    static create(element: HTMLElement, character: string, options?: WriterOptions): HanziWriter
    loopCharacterAnimation(): void
    pauseAnimation(): void
    quiz(options?: QuizOptions): void
    hideCharacter(): void
    showCharacter(): void
  }

  export default HanziWriter
  export type { StrokeData }
}
