import Link from "next/link";

type QrazenLogoProps = {
  href?: string;
  variant?: "cinematic" | "compact";
  className?: string;
};

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 ${compact ? "h-9 w-9" : "h-10 w-10"}`}
    >
      <span className="absolute inset-0 rounded-[13px] bg-cyan-400/10 blur-md" />
      <svg viewBox="0 0 64 64" className="relative h-full w-full" fill="none">
        <defs>
          <linearGradient id="qrazen-a" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#67E8F9" />
            <stop offset="0.45" stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          <filter id="qrazen-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#qrazen-glow)">
          <rect x="5" y="5" width="25" height="25" rx="7" fill="url(#qrazen-a)" />
          <rect x="34" y="5" width="25" height="25" rx="7" fill="url(#qrazen-a)" />
          <rect x="5" y="34" width="25" height="25" rx="7" fill="url(#qrazen-a)" />
          <rect x="36" y="36" width="8" height="8" rx="2.5" fill="url(#qrazen-a)" />
          <rect x="49" y="36" width="8" height="8" rx="2.5" fill="url(#qrazen-a)" />
          <rect x="42.5" y="49" width="8" height="8" rx="2.5" fill="url(#qrazen-a)" />
        </g>
      </svg>
    </span>
  );
}

export function QrazenLogo({ href = "/", variant = "cinematic", className = "" }: QrazenLogoProps) {
  const compact = variant === "compact";
  return (
    <Link href={href} aria-label="QRAZEN" className={`group inline-flex items-center ${compact ? "gap-2" : "gap-3"} ${className}`}>
      <Mark compact={compact} />
      {!compact && (
        <span className="font-black tracking-[0.12em] text-white text-[17px] leading-none">
          QRAZEN
        </span>
      )}
    </Link>
  );
}
