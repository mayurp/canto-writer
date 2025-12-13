type LogoMarkProps = {
  size?: number
}

export function LogoMark({ size = 20 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Menu icon"
    >
      <rect x="3" y="5" width="18" height="2.2" rx="1.1" fill="#f8fafc" />
      <rect x="3" y="10.9" width="18" height="2.2" rx="1.1" fill="#f8fafc" />
      <rect x="3" y="16.8" width="18" height="2.2" rx="1.1" fill="#f8fafc" />
    </svg>
  )
}
