"use client";

import { cn } from "@/lib/utils";
import { RARITY_BORDER, RARITY_GLOW, type Rarity } from "@/lib/rarity";
import type { TitleBadgeRarity } from "@/components/titles/TitleBadge";

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
        RARITY_BORDER[rarity as Rarity],
        RARITY_GLOW[rarity as Rarity],
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
