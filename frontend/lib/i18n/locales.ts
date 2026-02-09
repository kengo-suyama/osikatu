export type Locale = "ja" | "en" | "ko" | "es" | "zh-Hant";

export const LOCALES: { id: Locale; label: string; nativeName: string }[] = [
  { id: "ja", label: "Japanese", nativeName: "日本語" },
  { id: "en", label: "English", nativeName: "English" },
  { id: "ko", label: "Korean", nativeName: "한국어" },
  { id: "es", label: "Spanish", nativeName: "Español" },
  { id: "zh-Hant", label: "Traditional Chinese", nativeName: "繁體中文" },
];

export const DEFAULT_LOCALE: Locale = "ja";
