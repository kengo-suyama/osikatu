"use client";

import { motion, useReducedMotion } from "framer-motion";

const SHIDES = [
  { left: "14%", delay: 0.0, rotate: -18 },
  { left: "28%", delay: 0.03, rotate: 8 },
  { left: "41%", delay: 0.06, rotate: -10 },
  { left: "54%", delay: 0.02, rotate: 14 },
  { left: "66%", delay: 0.08, rotate: -6 },
  { left: "78%", delay: 0.05, rotate: 12 },
];

export function ShideParticles() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      data-testid="gacha-shide"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {SHIDES.map((s, idx) => (
        <motion.span
          // Deterministic positions for stable tests.
          key={idx}
          className="absolute top-6 h-12 w-4 rounded-sm border border-amber-200/60 bg-white/90 shadow-sm"
          style={{ left: s.left, rotate: s.rotate }}
          initial={reduceMotion ? { opacity: 0.55 } : { y: -6, opacity: 0 }}
          animate={
            reduceMotion
              ? { opacity: 0.55 }
              : { y: 90, opacity: [0, 1, 1, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.55, delay: s.delay, ease: "easeOut" }
          }
        />
      ))}
    </div>
  );
}

