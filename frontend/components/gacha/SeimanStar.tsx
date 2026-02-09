"use client";

import { cn } from "@/lib/utils";

export function SeimanStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={cn("h-full w-full", className)}
    >
      <circle
        cx="100"
        cy="100"
        r="76"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.35"
      />
      <path
        d="M100 34 L120 83 L172 83 L130 114 L145 166 L100 136 L55 166 L70 114 L28 83 L80 83 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle
        cx="100"
        cy="100"
        r="4"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

