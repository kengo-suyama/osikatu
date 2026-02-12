import { loadString, saveString } from "@/lib/storage";
import type { MeDto } from "@/lib/types";
import type { ThemeId } from "@/src/theme/themes";

const THEME_KEY = "osikatu:ui:theme";
const SPECIAL_BG_KEY = "osikatu:ui:special_bg";
const DARK_THEMES = new Set(["dark", "midnight", "neon", "royal", "mystic"]);

export const isDarkThemeId = (themeId: string): boolean => {
  return DARK_THEMES.has(themeId);
};

export const getStoredThemeId = (): ThemeId => {
  const stored = loadString(THEME_KEY);
  if (stored) return stored as ThemeId;
  return "light";
};

export const applyTheme = (themeId: ThemeId) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = themeId;
  if (DARK_THEMES.has(themeId)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

export const setStoredThemeId = (themeId: ThemeId) => {
  saveString(THEME_KEY, themeId);
  applyTheme(themeId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ui-theme-change"));
  }
};

export const getStoredSpecialBgEnabled = (): boolean => {
  return loadString(SPECIAL_BG_KEY) === "true";
};

export const setStoredSpecialBgEnabled = (enabled: boolean) => {
  saveString(SPECIAL_BG_KEY, String(enabled));
};

export const syncUiSettingsFromMe = (me: MeDto | null) => {
  if (!me?.ui) return;
  if (me.ui.themeId) {
    setStoredThemeId(me.ui.themeId as ThemeId);
  }
  if (typeof me.ui.specialBgEnabled === "boolean") {
    setStoredSpecialBgEnabled(me.ui.specialBgEnabled);
  }
};
