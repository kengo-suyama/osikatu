"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { ShimenawaHeader } from "@/components/gacha/ShimenawaHeader";
import { ShuinStamp } from "@/components/gacha/ShuinStamp";
import { ShideParticles } from "@/components/gacha/ShideParticles";

export type SealPhase = "idle" | "charge" | "crack" | "burst";

function phaseTestId(phase: SealPhase) {
  if (phase === "charge") return "gacha-seal-charge";
  if (phase === "crack") return "gacha-seal-crack";
  if (phase === "burst") return "gacha-seal-burst";
  return undefined;
}

export function SealOfuda({
  phase,
  className,
}: {
  phase: SealPhase;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const glow =
    phase === "charge" ? "shadow-[0_0_0_6px_rgba(245,158,11,0.12)]" : "";
  const burstGlow =
    phase === "burst"
      ? "shadow-[0_0_0_7px_rgba(245,158,11,0.16),0_0_34px_rgba(255,255,255,0.25)]"
      : "";

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[320px]", className)}
      data-testid={phaseTestId(phase)}
    >
      <ShimenawaHeader className="mx-auto mb-3 w-full max-w-[320px]" />

      <motion.div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-amber-50/90 via-white to-amber-50/50 p-4 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20",
          glow,
          burstGlow
        )}
        initial={false}
        animate={
          reduceMotion
            ? {}
            : phase === "charge"
              ? { filter: "brightness(1.05)" }
              : { filter: "brightness(1)" }
        }
        transition={{ duration: 0.25 }}
      >
        {/* Paper texture hint */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.75),_transparent_40%),radial-gradient(circle_at_80%_30%,_rgba(255,236,196,0.45),_transparent_45%)] opacity-70" />

        {/* Seal glyph */}
        <div className="relative mx-auto grid aspect-[3/4] w-[220px] place-items-center rounded-xl border border-amber-200/70 bg-white/70 px-4 py-6 shadow-sm dark:border-amber-900/30 dark:bg-white/5">
          <div className="absolute left-4 right-4 top-4 h-px bg-amber-800/15" />
          <div className="absolute left-4 right-4 bottom-4 h-px bg-amber-800/15" />

          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-amber-900/60 dark:text-amber-100/60">
              封印
            </div>
            <div className="mt-2 text-4xl font-black tracking-[0.18em] text-amber-950/80 dark:text-amber-50/85">
              札
            </div>
            <div className="mt-3 text-[10px] font-medium text-amber-900/55 dark:text-amber-100/55">
              ひらけ、ご縁。
            </div>
          </div>

          {/* Crack lines */}
          {phase === "crack" || phase === "burst" ? (
            <div className="pointer-events-none absolute inset-0 opacity-80">
              <svg viewBox="0 0 220 300" className="h-full w-full">
                <path
                  d="M110 34 L96 74 L122 92 L98 132 L126 160 L108 206 L132 236 L114 274"
                  fill="none"
                  stroke="rgba(120,73,23,0.45)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M84 108 L72 132 L92 148"
                  fill="none"
                  stroke="rgba(120,73,23,0.35)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M134 116 L152 142 L136 160"
                  fill="none"
                  stroke="rgba(120,73,23,0.35)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : null}

          {/* Burst spotlight */}
          {phase === "burst" ? (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_rgba(255,255,255,0.65),_transparent_55%)]" />
          ) : null}

          <div className="absolute bottom-5 right-5">
            <ShuinStamp />
          </div>
        </div>

        {phase === "burst" ? <ShideParticles /> : null}
      </motion.div>
    </div>
  );
}

