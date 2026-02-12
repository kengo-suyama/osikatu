"use client";

import { cn } from "@/lib/utils";
import { RARITY_BADGE_STYLE, RARITY_STARS, type Rarity } from "@/lib/rarity";

export type TitleBadgeRarity = Rarity;

export function TitleBadge({
  title,
  rarity,
  className,
}: {
  title: string;
  rarity: TitleBadgeRarity;
  className?: string;
}) {
  const stars = RARITY_STARS[rarity] ?? 0;
  return (
    <div
      data-testid="title-badge"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        RARITY_BADGE_STYLE[rarity],
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
