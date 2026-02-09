"use client";

import { cn } from "@/lib/utils";

export function ShimenawaHeader({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden="true">
      <svg viewBox="0 0 800 180" className="h-auto w-full">
        <defs>
          <linearGradient id="rope" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c99a3b" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#e4c06a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#c99a3b" stopOpacity="0.85" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rope */}
        <path
          d="M40 70 C160 26, 300 28, 400 60 C520 96, 650 92, 760 54"
          fill="none"
          stroke="url(#rope)"
          strokeWidth="22"
          strokeLinecap="round"
          filter="url(#softGlow)"
        />
        <path
          d="M40 70 C160 26, 300 28, 400 60 C520 96, 650 92, 760 54"
          fill="none"
          stroke="#8b5a1a"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Twists */}
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 90 + i * 62;
          const y = 62 + (i % 2) * 6;
          return (
            <path
              key={i}
              d={`M${x - 18} ${y - 10} Q${x} ${y} ${x + 18} ${y - 10}`}
              fill="none"
              stroke="#7c4a13"
              strokeOpacity="0.25"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {/* Bells */}
        {[
          { x: 255, y: 82 },
          { x: 400, y: 98 },
          { x: 545, y: 88 },
        ].map((b, i) => (
          <g key={i} opacity="0.85">
            <line
              x1={b.x}
              y1={b.y - 12}
              x2={b.x}
              y2={b.y + 8}
              stroke="#7c4a13"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={`M${b.x - 14} ${b.y + 8} Q${b.x} ${b.y - 6} ${b.x + 14} ${
                b.y + 8
              }`}
              fill="#d4b05b"
              stroke="#8b5a1a"
              strokeWidth="2"
            />
            <circle cx={b.x} cy={b.y + 10} r="3" fill="#8b5a1a" />
          </g>
        ))}

        {/* Shide (paper streamers) */}
        {[
          { x: 175, y: 88, s: 1 },
          { x: 325, y: 102, s: 1.05 },
          { x: 475, y: 108, s: 0.95 },
          { x: 625, y: 94, s: 1.1 },
        ].map((p, i) => (
          <g
            key={i}
            transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
            opacity="0.9"
          >
            <path
              d="M0 0 L14 14 L0 28 L14 42 L0 56 L-14 42 L0 28 L-14 14 Z"
              fill="#f7f3ea"
              stroke="#d8d2c6"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

