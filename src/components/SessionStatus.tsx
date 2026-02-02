import { useSchedulerContext } from '../context/SchedulerContext'
import { useUserStatsContext } from '../context/UserStatsContext'

export function SessionStatus() {
  const { dueCount } = useSchedulerContext()
  const { stats, animationState } = useUserStatsContext()

  const { totalPoints } = stats
  const { isGlowing, pillRef } = animationState

  return (
    <div className="session-status-container">
      <div
        ref={pillRef}
        className={`points-pill${isGlowing ? ' points-pill-glow' : ''}`}
        aria-live="polite"
      >
        <span>💎</span>
        <strong>{totalPoints}</strong>
      </div>
      <div className="session-meta" aria-live="polite">
        <span>Due</span>
        <strong>{dueCount}</strong>
      </div>
    </div>
  )
}
