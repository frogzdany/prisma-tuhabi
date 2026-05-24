"use client";

// Inline SVG Prisma mark — the teal/cyan/violet gradient triangle from the
// design package (prisma/project/app.jsx Logo component). Use this for chrome
// (header badges, phone avatars) where we want a crisp vector instead of the
// raster brand asset in public/brand/prisma/.

export interface PrismaLogoMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PrismaLogoMark({ size = 28, className, style }: PrismaLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ filter: "drop-shadow(0 0 8px rgba(94,234,212,0.35))", ...style }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="prisma-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="55%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <path d="M16 4 L28 26 L4 26 Z" fill="url(#prisma-mark-gradient)" />
      <path d="M16 4 L16 26" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" />
    </svg>
  );
}
