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

  type QuizOptions = {
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
}
