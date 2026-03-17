import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

type UserStatsContextValue = {
  stats: UserStats
  animationState: {
    pending: PointsAnimation[]
    isGlowing: boolean
    pillRef: RefObject<HTMLDivElement | null>
    trigger: (amount: number) => void
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
  const glowTimeoutRef = useRef<number | null>(null)

  const triggerPointsAnimation = useCallback((amount: number) => {
    const id = `points-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setPendingAnimations((prev) => [...prev, { id, amount }])
  }, [])

  const completeAnimation = useCallback(async (id: string, amount: number) => {
    setPendingAnimations((prev) => prev.filter((a) => a.id !== id))
    setIsGlowing(true)
    if (glowTimeoutRef.current !== null) {
      window.clearTimeout(glowTimeoutRef.current)
    }
    glowTimeoutRef.current = window.setTimeout(() => {
      setIsGlowing(false)
      glowTimeoutRef.current = null
    }, 400)

    try {
      await db.transaction('rw', db.userStats, async () => {
        const current = (await db.userStats.get(DEFAULT_USER_STATS_KEY)) ?? {
          ...defaultUserStats,
          id: DEFAULT_USER_STATS_KEY,
        }
        await db.userStats.put({
          ...current,
          totalPoints: current.totalPoints + amount,
        })
      })
    } catch (error) {
      console.error('Failed to save user stats', error)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current !== null) {
        window.clearTimeout(glowTimeoutRef.current)
      }
    }
  }, [])

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
