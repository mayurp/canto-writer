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

  class HanziWriter {
    static create(element: HTMLElement, character: string, options?: WriterOptions): HanziWriter
    loopCharacterAnimation(): void
    pauseAnimation(): void
    quiz(): void
    showCharacter(): void
  }

  export default HanziWriter
}
