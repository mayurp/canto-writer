type LogoMarkProps = {
  size?: number
}

export function LogoMark({ size = 48 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Canto Writer logo"
    >
      <defs>
        <linearGradient id="cantoMark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#f8fafc" />
      <path
        d="M16 44c10-4 16-12 20-24"
        stroke="url(#cantoMark)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="42" cy="20" r="6" fill="#0f172a" opacity="0.07" />
      <circle cx="46" cy="24" r="3" fill="#0f172a" opacity="0.18" />
    </svg>
  )
}
