export type Locale = "ja" | "en" | "ko" | "es" | "zh-Hant";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "ja", label: "日本語" },
  { id: "en", label: "English" },
  { id: "ko", label: "한국어" },
  { id: "es", label: "Español" },
  { id: "zh-Hant", label: "繁體中文" },
];

export const DEFAULT_LOCALE: Locale = "ja";
