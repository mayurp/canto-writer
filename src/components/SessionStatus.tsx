type SessionStatusProps = {
  dueCount: number
  totalCount: number
}

export function SessionStatus({ dueCount, totalCount }: SessionStatusProps) {
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
