import { createContext, useContext, type ReactNode } from 'react'
import { useVocabExamples } from '../hooks/useVocabExamples'

const VocabExamplesContext = createContext<ReturnType<typeof useVocabExamples> | undefined>(undefined)

export const VocabExamplesProvider = ({ children }: { children: ReactNode }) => {
  const vocabState = useVocabExamples()
  return <VocabExamplesContext.Provider value={vocabState}>{children}</VocabExamplesContext.Provider>
}

export const useVocabExamplesContext = () => {
  const context = useContext(VocabExamplesContext)
  if (!context) {
    throw new Error('useVocabExamplesContext must be used within VocabExamplesProvider')
  }
  return context
}
