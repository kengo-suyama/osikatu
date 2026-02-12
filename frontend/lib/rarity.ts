/**
 * Unified rarity tokens — single source of truth for rarity styling.
 */

export type Rarity = "N" | "R" | "SR" | "SSR" | "UR";

export const RARITY_STARS: Record<Rarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  SSR: 3,
  UR: 5,
};

/** Full badge style (TitleBadge background + border + text). */
export const RARITY_BADGE_STYLE: Record<Rarity, string> = {
  N: "border-border/60 bg-muted/30 text-muted-foreground",
  R: "border-sky-300/50 bg-sky-50/70 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-200",
  SR: "border-emerald-300/50 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200",
  SSR: "border-amber-300/60 bg-amber-50/70 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200",
  UR: "border-rose-300/60 bg-rose-50/70 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-200",
};

/** Nameplate border color. */
export const RARITY_BORDER: Record<Rarity, string> = {
  N: "border-border/60",
  R: "border-sky-400/50",
  SR: "border-emerald-400/50",
  SSR: "border-amber-400/60",
  UR: "border-rose-400/60",
};

/** Nameplate glow shadow. */
export const RARITY_GLOW: Record<Rarity, string> = {
  N: "",
  R: "shadow-[0_0_0_2px_rgba(56,189,248,0.10)]",
  SR: "shadow-[0_0_0_2px_rgba(52,211,153,0.10)]",
  SSR: "shadow-[0_0_0_2px_rgba(251,191,36,0.12)]",
  UR: "shadow-[0_0_0_2px_rgba(251,113,133,0.12)]",
};

/** Human-readable label. */
export const RARITY_LABEL: Record<Rarity, string> = {
  N: "Normal",
  R: "Rare",
  SR: "Super Rare",
  SSR: "Super Super Rare",
  UR: "Ultra Rare",
};
