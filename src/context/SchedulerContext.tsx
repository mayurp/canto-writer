import { createContext, useContext, type ReactNode } from 'react'
import { useScheduler } from '../hooks/useScheduler'
import type { SchedulerCard } from '../srs/createManager'
import type { FlashcardDefinition } from '../data/cards'
import type { GradingInfo } from '../srs/types'

export type SchedulerValue = {
  cards: SchedulerCard[]
  currentCard: SchedulerCard | null
  totalCount: number
  dueCount: number
  nextDueDate: Date | null
  gradeCard: (cardId: string, grading: GradingInfo) => void
  shouldShowOutline: (cardId: string) => boolean
}

export const SchedulerContext = createContext<SchedulerValue | null>(null)

export function SchedulerProvider({deck, children}: {
  deck: FlashcardDefinition[]
  children: ReactNode
}) {
  const scheduler = useScheduler(deck)

  return (
    <SchedulerContext.Provider value={scheduler}>
      {children}
    </SchedulerContext.Provider>
  )
}

export const useSchedulerContext = () => {
  const value = useContext(SchedulerContext)
  if (!value) {
    throw new Error('useSchedulerContext must be used within SchedulerProvider')
  }
  return value
}
