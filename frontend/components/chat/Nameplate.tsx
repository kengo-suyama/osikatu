"use client";

import { cn } from "@/lib/utils";
import type { TitleBadgeRarity } from "@/components/titles/TitleBadge";

const rarityToBorder: Record<TitleBadgeRarity, string> = {
  N: "border-border/60",
  R: "border-sky-400/50",
  SR: "border-emerald-400/50",
  SSR: "border-amber-400/60",
  UR: "border-rose-400/60",
};

const rarityToGlow: Record<TitleBadgeRarity, string> = {
  N: "",
  R: "shadow-[0_0_0_2px_rgba(56,189,248,0.10)]",
  SR: "shadow-[0_0_0_2px_rgba(52,211,153,0.10)]",
  SSR: "shadow-[0_0_0_2px_rgba(251,191,36,0.12)]",
  UR: "shadow-[0_0_0_2px_rgba(251,113,133,0.12)]",
};

export function Nameplate({
  name,
  rarity = "N",
  className,
}: {
  name: string;
  rarity?: TitleBadgeRarity;
  className?: string;
}) {
  return (
    <span
      data-testid="chat-nameplate"
      className={cn(
        "inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm",
        rarityToBorder[rarity],
        rarityToGlow[rarity],
        className
      )}
    >
      <span
        data-testid="chat-nameplate-rarity"
        className="rounded-full border border-current/15 bg-white/40 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-foreground/70 dark:bg-white/5"
      >
        {rarity}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

