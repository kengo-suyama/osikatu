"use client";

import { loadString, saveString } from "@/lib/storage";

export type BirthdayFxTheme = "elegant" | "idol" | "cute";
export type BirthdayMode = "NORMAL" | "TEASER" | "BIRTHDAY";

export const BIRTHDAY_FX_ENABLED_KEY = "osikatu:ui:birthday_fx_enabled";
export const BIRTHDAY_FX_THEME_KEY = "osikatu:ui:birthday_fx_theme";

export const DEFAULT_BIRTHDAY_FX: BirthdayFxTheme = "elegant";

export const BIRTHDAY_FX_LABELS: Record<
  BirthdayFxTheme,
  { label: string; description: string }
> = {
  elegant: { label: "上品キラキラ", description: "光沢＋少量コンフェッティ" },
  idol: { label: "アイドルライブ", description: "ペンライト＋星粒子" },
  cute: { label: "かわいい量産型", description: "ハート＋リボン" },
};

export const getBirthdayFxEnabled = () => {
  const stored = loadString(BIRTHDAY_FX_ENABLED_KEY);
  if (!stored) return true;
  return stored === "true";
};

export const getBirthdayFxTheme = (): BirthdayFxTheme => {
  const stored = loadString(BIRTHDAY_FX_THEME_KEY);
  if (stored === "idol" || stored === "cute" || stored === "elegant") return stored;
  return DEFAULT_BIRTHDAY_FX;
};

export const setBirthdayFxEnabled = (enabled: boolean) => {
  saveString(BIRTHDAY_FX_ENABLED_KEY, String(enabled));
};

export const setBirthdayFxTheme = (theme: BirthdayFxTheme) => {
  saveString(BIRTHDAY_FX_THEME_KEY, theme);
};
