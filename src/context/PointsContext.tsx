import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../models/db'
import {
  DEFAULT_USER_STATS_KEY,
  defaultUserStats,
  type UserStats,
} from '../models/UserStats'

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
  const record = useLiveQuery(
    () => db.userStats.get(DEFAULT_USER_STATS_KEY),
    [],
    null,
  )
  const stats: UserStats = record
    ? { ...defaultUserStats, ...record }
    : defaultUserStats

  const [pendingAnimations, setPendingAnimations] = useState<PointsAnimation[]>(
    [],
  )
  const [isGlowing, setIsGlowing] = useState(false)
  const pillRef = useRef<HTMLDivElement | null>(null)

  const triggerPointsAnimation = useCallback((amount: number) => {
    const id = `points-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setPendingAnimations((prev) => [...prev, { id, amount }])
  }, [])

  const completeAnimation = useCallback(
    (id: string, amount: number) => {
      setPendingAnimations((prev) => prev.filter((a) => a.id !== id))
      setIsGlowing(true)
      setTimeout(() => setIsGlowing(false), 400)

      // Persist to DB
      const updatedStats: UserStats = {
        ...stats,
        totalPoints: stats.totalPoints + amount,
      }
      void db.userStats
        .put({ ...updatedStats, id: DEFAULT_USER_STATS_KEY })
        .catch((error) => {
          console.error('Failed to save user stats', error)
        })
    },
    [stats],
  )

  return (
    <PointsContext.Provider
      value={{
        points: stats.totalPoints,
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
