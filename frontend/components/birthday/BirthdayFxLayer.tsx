"use client";

import { useReducedMotion } from "framer-motion";

import type { BirthdayFxTheme, BirthdayMode } from "@/lib/birthdayFx";
import ConfettiElegant from "@/components/birthday/particles/ConfettiElegant";
import HeartsCute from "@/components/birthday/particles/HeartsCute";
import StarsIdol from "@/components/birthday/particles/StarsIdol";

export default function BirthdayFxLayer({
  mode,
  theme,
  enabled,
}: {
  mode: BirthdayMode;
  theme: BirthdayFxTheme;
  enabled: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (!enabled) return null;

  if (mode === "TEASER") {
    return (
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
    );
  }

  if (mode !== "BIRTHDAY" || reduceMotion) return null;

  if (theme === "idol") return <StarsIdol />;
  if (theme === "cute") return <HeartsCute />;
  return <ConfettiElegant />;
}
