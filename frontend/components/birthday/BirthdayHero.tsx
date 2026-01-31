"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";

import BirthdayFxLayer from "@/components/birthday/BirthdayFxLayer";
import { useBirthdayFx } from "@/components/birthday/useBirthdayFx";
import { useBirthdayMode } from "@/components/birthday/useBirthdayMode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BirthdayHeroProps = {
  oshiName: string;
  nickname?: string | null;
  birthdayISO?: string | null;
  accentColor?: string;
  compact?: boolean;
};

export default function BirthdayHero({
  oshiName,
  nickname,
  birthdayISO,
  accentColor,
  compact = false,
}: BirthdayHeroProps) {
  const { mode, days, label } = useBirthdayMode(birthdayISO);
  const { enabled, theme } = useBirthdayFx();

  if (days === null) return null;
  if (mode === "NORMAL") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm",
        compact ? "p-3" : "p-4"
      )}
      style={{ backgroundColor: accentColor ? `hsl(${accentColor})` : undefined }}
    >
      <div className="relative z-10 space-y-2 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
          <PartyPopper className="h-4 w-4" />
          {mode === "BIRTHDAY" ? "Happy Birthday" : "Birthday Countdown"}
        </div>
        <div className={cn("font-semibold", compact ? "text-lg" : "text-2xl")}>
          {oshiName}
          {nickname ? `（${nickname}）` : ""}
        </div>
        <div className={cn("text-sm", compact ? "text-xs" : "text-sm")}>{label}</div>

        {mode === "BIRTHDAY" && !compact ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/log">ログを書く</Link>
            </Button>
            <Button variant="outline" size="sm" className="text-white">
              <Sparkles className="mr-2 h-4 w-4" />
              写真を盛る（準備中）
            </Button>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.25),rgba(255,255,255,0.05),rgba(255,255,255,0.25))] opacity-60" />
      <BirthdayFxLayer mode={mode} theme={theme} enabled={enabled} />
    </motion.div>
  );
}
