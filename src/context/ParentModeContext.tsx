import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ParentModeContextValue = {
  isUnlocked: boolean
  error: string | null
  unlockParentMode: (pin: string) => void
  lockParentMode: () => void
  clearError: () => void
}

const ParentModeContext = createContext<ParentModeContextValue | null>(null)

const PARENT_PIN = '2007'

export const ParentModeProvider = ({ children }: { children: ReactNode }) => {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unlockParentModeInternal = useCallback((pin: string) => {
    if (pin === PARENT_PIN) {
      setIsUnlocked(true)
      setError(null)
    } else {
      setError('Incorrect PIN')
      setIsUnlocked(false)
    }
  }, [])

  const lockParentModeInternal = useCallback(() => {
    setIsUnlocked(false)
  }, [])

  const value = useMemo<ParentModeContextValue>(
    () => ({
      isUnlocked,
      error,
      unlockParentMode: (pin: string) => {
        unlockParentModeInternal(pin)
      },
      lockParentMode: () => {
        setError(null)
        lockParentModeInternal()
      },
      clearError: () => setError(null),
    }),
    [error, isUnlocked, lockParentModeInternal, unlockParentModeInternal],
  )

  return <ParentModeContext.Provider value={value}>{children}</ParentModeContext.Provider>
}

export const useParentModeContext = () => {
  const ctx = useContext(ParentModeContext)
  if (!ctx) {
    throw new Error('useParentModeContext must be used within ParentModeProvider')
  }
  return ctx
}
