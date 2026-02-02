import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

type PointsAnimation = {
  id: string
  amount: number
}

type PointsContextValue = {
  points: number
  pendingAnimations: PointsAnimation[]
  isGlowing: boolean
  pillRef: RefObject<HTMLDivElement | null>
  triggerPointsAnimation: (amount: number) => void
  completeAnimation: (id: string, amount: number) => void
}

const PointsContext = createContext<PointsContextValue | null>(null)

export function PointsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(0)
  const [pendingAnimations, setPendingAnimations] = useState<PointsAnimation[]>(
    [],
  )
  const [isGlowing, setIsGlowing] = useState(false)
  const pillRef = useRef<HTMLDivElement | null>(null)

  const triggerPointsAnimation = useCallback((amount: number) => {
    const id = `points-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setPendingAnimations((prev) => [...prev, { id, amount }])
  }, [])

  const completeAnimation = useCallback((id: string, amount: number) => {
    setPendingAnimations((prev) => prev.filter((a) => a.id !== id))
    setPoints((prev) => prev + amount)
    setIsGlowing(true)
    setTimeout(() => setIsGlowing(false), 400)
  }, [])

  return (
    <PointsContext.Provider
      value={{
        points,
        pendingAnimations,
        isGlowing,
        pillRef,
        triggerPointsAnimation,
        completeAnimation,
      }}
    >
      {children}
    </PointsContext.Provider>
  )
}

export function usePointsContext() {
  const value = useContext(PointsContext)
  if (!value) {
    throw new Error('usePointsContext must be used within PointsProvider')
  }
  return value
}
