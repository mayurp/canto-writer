type AudioButtonProps = {
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
  speaking?: boolean
  variant?: 'default' | 'small'
}

export function AudioButton({
  onClick,
  disabled = false,
  ariaLabel,
  speaking = false,
  variant = 'default',
}: AudioButtonProps) {
  const className = variant === 'small' ? 'audio-button audio-button--small' : 'audio-button'

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      <svg className="audio-glyph" viewBox="0 0 64 64" role="presentation" aria-hidden="true">
        <path
          d="M16 28h10l12-10v28l-12-10H16z"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 22c4 4 4 16 0 20m8-26c6 8 6 24 0 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={speaking ? 1 : 0.6}
        />
      </svg>
    </button>
  )
}
