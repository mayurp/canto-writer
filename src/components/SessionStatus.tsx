import { useSchedulerContext } from '../context/SchedulerContext'
import { usePointsContext } from '../context/PointsContext'

export function SessionStatus() {
  const { dueCount } = useSchedulerContext()
  const { points, isGlowing, pillRef } = usePointsContext()
  return (
    <div className="session-status-container">
      <div
        ref={pillRef}
        className={`points-pill${isGlowing ? ' points-pill-glow' : ''}`}
        aria-live="polite"
      >
        <span>💎</span>
        <strong>{points}</strong>
      </div>
      <div className="session-meta" aria-live="polite">
        <span>Due</span>
        <strong>{dueCount}</strong>
      </div>
    </div>
  )
}
