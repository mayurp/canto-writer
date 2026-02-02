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

import { PointsSoundVariant } from '../utils/pointsSound'

type PointsAnimation = {
  id: string
  amount: number
  variant: PointsSoundVariant
}

type UserStatsContextValue = {
  stats: UserStats
  animationState: {
    pending: PointsAnimation[]
    isGlowing: boolean
    pillRef: RefObject<HTMLDivElement | null>
    trigger: (amount: number, variant?: PointsSoundVariant) => void
    complete: (id: string, amount: number) => void
  }
}

const UserStatsContext = createContext<UserStatsContextValue | null>(null)

export function UserStatsProvider({ children }: { children: ReactNode }) {
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

  const triggerPointsAnimation = useCallback(
    (
      amount: number,
      variant: PointsSoundVariant = PointsSoundVariant.Standard,
    ) => {
      const id = `points-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setPendingAnimations((prev) => [...prev, { id, amount, variant }])
    },
    [],
  )

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
    <UserStatsContext.Provider
      value={{
        stats,
        animationState: {
          pending: pendingAnimations,
          isGlowing,
          pillRef,
          trigger: triggerPointsAnimation,
          complete: completeAnimation,
        },
      }}
    >
      {children}
    </UserStatsContext.Provider>
  )
}

export function useUserStatsContext() {
  const value = useContext(UserStatsContext)
  if (!value) {
    throw new Error('useUserStatsContext must be used within UserStatsProvider')
  }
  return value
}
