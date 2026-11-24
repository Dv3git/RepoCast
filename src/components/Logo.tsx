export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <rect x="25" y="12" width="14" height="24" rx="7" fill="#fff" />
      <path d="M18 30a14 14 0 0 0 28 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 44v8M24 52h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="16" r="5" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">
        Repo<span className="text-gradient">Cast</span>
      </span>
    </span>
  );
}
