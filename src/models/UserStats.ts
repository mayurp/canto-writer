export interface UserStats {
  totalPoints: number
}

export interface UserStatsRecord extends UserStats {
  id: string
}

export const DEFAULT_USER_STATS_KEY = '#userstats'

export const defaultUserStats: UserStats = {
  totalPoints: 0,
}
