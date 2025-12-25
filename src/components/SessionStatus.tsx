import { useSchedulerContext } from '../context/SchedulerContext'

export function SessionStatus() {
  const { dueCount, totalCount } = useSchedulerContext()
  return (
    <div className="session-meta" aria-live="polite">
      <span>Due</span>
      <strong>
        {dueCount}
        <span className="total"> / {totalCount}</span>
      </strong>
    </div>
  )
}
