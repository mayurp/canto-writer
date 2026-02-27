import { createContext, useContext, type ReactNode } from 'react'
import { useCharacterData } from '../hooks/useCharacterData'

export const CharacterDataContext = createContext<
  ReturnType<typeof useCharacterData> | undefined
>(undefined)

export const CharacterDataProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const characterData = useCharacterData()
  return (
    <CharacterDataContext.Provider value={characterData}>
      {children}
    </CharacterDataContext.Provider>
  )
}

export const useCharacterDataContext = () => {
  const context = useContext(CharacterDataContext)
  if (context === undefined) {
    throw new Error(
      'useCharacterDataContext must be used within a CharacterDataProvider',
    )
  }
  return context
}
