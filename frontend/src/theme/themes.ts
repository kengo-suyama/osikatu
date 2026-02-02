import type { Plan } from "@/lib/types";

export type ThemeId =
  | "light"
  | "dark"
  | "sakura"
  | "mint"
  | "sunset"
  | "midnight"
  | "neon"
  | "royal"
  | "ocean"
  | "berry";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
};

const FREE_THEMES: ThemeDefinition[] = [
  { id: "light", label: "シンプル" },
  { id: "dark", label: "ナイト" },
  { id: "sakura", label: "ポップ" },
  { id: "mint", label: "ナチュラル" },
  { id: "sunset", label: "サンセット" },
];

const PREMIUM_THEMES: ThemeDefinition[] = [
  ...FREE_THEMES,
  { id: "midnight", label: "ロック" },
  { id: "neon", label: "EDM" },
  { id: "royal", label: "クラシック" },
  { id: "ocean", label: "シティポップ" },
  { id: "berry", label: "ヒップホップ" },
];

export const ALL_THEMES: ThemeDefinition[] = PREMIUM_THEMES;

export const getThemeLimit = (plan: Plan): number => (plan === "free" ? 5 : 10);

export const getVisibleThemes = (plan: Plan): ThemeDefinition[] => {
  if (plan === "free") return ALL_THEMES;
  return PREMIUM_THEMES;
};

export const isThemeLocked = (themeId: ThemeId, plan: Plan): boolean => {
  if (plan !== "free") return false;
  return !FREE_THEMES.some((theme) => theme.id === themeId);
};

export const getThemeLabel = (themeId: ThemeId): string => {
  return ALL_THEMES.find((theme) => theme.id === themeId)?.label ?? "シンプル";
};
