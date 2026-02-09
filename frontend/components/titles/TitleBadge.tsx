"use client";

import { cn } from "@/lib/utils";

export type TitleBadgeRarity = "N" | "R" | "SR" | "SSR" | "UR";

const rarityToStars: Record<TitleBadgeRarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  SSR: 3,
  UR: 5,
};

const rarityToStyle: Record<TitleBadgeRarity, string> = {
  N: "border-border/60 bg-muted/30 text-muted-foreground",
  R: "border-sky-300/50 bg-sky-50/70 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-200",
  SR: "border-emerald-300/50 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200",
  SSR: "border-amber-300/60 bg-amber-50/70 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200",
  UR: "border-rose-300/60 bg-rose-50/70 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-200",
};

export function TitleBadge({
  title,
  rarity,
  className,
}: {
  title: string;
  rarity: TitleBadgeRarity;
  className?: string;
}) {
  const stars = rarityToStars[rarity] ?? 0;
  return (
    <div
      data-testid="title-badge"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        rarityToStyle[rarity],
        className
      )}
      aria-label={`${title} (${rarity})`}
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-full border border-current/20 bg-white/40 text-[10px] font-black dark:bg-white/5"
        aria-hidden="true"
      >
        印
      </span>
      <span className="max-w-[12rem] truncate">{title}</span>
      <span
        data-testid="title-badge-rarity"
        className="rounded-full border border-current/15 bg-white/40 px-1.5 py-0.5 text-[10px] font-black tracking-wide dark:bg-white/5"
      >
        {rarity}
      </span>
      <span
        data-testid="title-badge-stars"
        className="flex items-center gap-0.5 text-[10px] leading-none opacity-80"
        aria-hidden="true"
      >
        {Array.from({ length: stars }).map((_, idx) => (
          <span key={idx}>★</span>
        ))}
      </span>
    </div>
  );
}

