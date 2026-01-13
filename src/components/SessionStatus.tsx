import { useSchedulerContext } from '../context/SchedulerContext'

export function SessionStatus() {
  const { dueCount } = useSchedulerContext()
  return (
    <div className="session-meta" aria-live="polite">
      <span>Due</span>
      <strong>
        {dueCount}
      </strong>
    </div>
  )
}
