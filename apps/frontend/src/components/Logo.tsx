export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#logo-g)" />
      <path
        d="M12 42c0-11 9-20 20-20s20 9 20 20"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line x1="12" y1="30" x2="12" y2="46" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <line x1="52" y1="30" x2="52" y2="46" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <line x1="8" y1="46" x2="56" y2="46" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
