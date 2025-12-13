export type FlashcardDefinition = {
  id: string
  order: number
  rthOrder?: number
  character: string
  meaning: string
  hanziWriterId: string
  jyutping?: string
  notes?: string
}
