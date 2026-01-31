"use client";

import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  CELEBRATION_AFTERGLOW_MS,
  CELEBRATION_DURATION_MS,
} from "@/lib/celebrations";
import type { CelebrationTheme } from "@/lib/types";

const STYLE_GRADIENT: Record<string, string> = {
  sparkle:
    "radial-gradient(circle at top, rgba(255,255,255,0.45), rgba(148,163,184,0.15), rgba(15,23,42,0.05))",
  idol:
    "radial-gradient(circle at top, rgba(56,189,248,0.35), rgba(99,102,241,0.2), rgba(30,41,59,0.15))",
  kawaii:
    "radial-gradient(circle at top, rgba(251,113,133,0.35), rgba(244,114,182,0.2), rgba(30,41,59,0.1))",
};

const STYLE_COLORS: Record<string, string[]> = {
  sparkle: ["#ffffff", "#fde68a", "#bae6fd", "#f8fafc"],
  idol: ["#22d3ee", "#a855f7", "#facc15", "#38bdf8"],
  kawaii: ["#fb7185", "#f472b6", "#fda4af", "#fecdd3"],
};

const INTENSITY_SCALE: Record<string, number> = {
  low: 0.6,
  mid: 0.85,
  high: 1.1,
  max: 1.4,
};

export default function CelebrationLayer({
  open,
  theme,
}: {
  open: boolean;
  theme: CelebrationTheme | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useReducedMotion();

  const duration = useMemo(() => {
    if (!theme) return 0;
    return CELEBRATION_DURATION_MS[theme.intensity];
  }, [theme]);

  useEffect(() => {
    if (!open || !theme || reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fire = confetti.create(canvas, { resize: true, useWorker: true });
    const scalar = INTENSITY_SCALE[theme.intensity] ?? 1;
    const colors = STYLE_COLORS[theme.style] ?? STYLE_COLORS.sparkle;
    const endTime = Date.now() + duration;

    const frame = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) return;
      fire({
        particleCount: Math.ceil(18 * scalar),
        spread: 70,
        startVelocity: 42,
        angle: 60,
        origin: { x: 0, y: 0.75 },
        colors,
        ticks: 140,
      });
      fire({
        particleCount: Math.ceil(18 * scalar),
        spread: 70,
        startVelocity: 42,
        angle: 120,
        origin: { x: 1, y: 0.75 },
        colors,
        ticks: 140,
      });
      requestAnimationFrame(frame);
    };

    frame();
    return () => {
      fire.reset();
    };
  }, [open, theme, reduceMotion, duration]);

  if (!theme) return null;

  const glowTransition = {
    duration: (duration + CELEBRATION_AFTERGLOW_MS) / 1000,
    times: [0, duration / (duration + CELEBRATION_AFTERGLOW_MS), 1],
    ease: "easeOut",
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: STYLE_GRADIENT[theme.style] ?? STYLE_GRADIENT.sparkle }}
            animate={{ opacity: [0, 1, 0.35] }}
            transition={reduceMotion ? { duration: 0 } : glowTransition}
          />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-center text-white drop-shadow"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="space-y-2">
              <div className="text-3xl font-semibold tracking-wide">{theme.title}</div>
              {theme.subtitle ? (
                <div className="text-sm text-white/90">{theme.subtitle}</div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
