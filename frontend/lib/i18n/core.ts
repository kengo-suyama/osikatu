import { useCallback, useMemo, useSyncExternalStore } from "react";
import { loadString, saveString } from "@/lib/storage";
import type { Dictionary } from "./types";
import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";
import ja from "./ja";

const LOCALE_KEY = "osikatu:locale";

const dictionaries: Record<Locale, () => Dictionary> = {
  ja: () => ja,
  en: () => require("./en").default,
  ko: () => require("./ko").default,
  es: () => require("./es").default,
  "zh-Hant": () => require("./zh-Hant").default,
};

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((l) => l());
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  if (currentLocale !== DEFAULT_LOCALE) return currentLocale;
  const stored = loadString(LOCALE_KEY);
  if (stored && stored in dictionaries) {
    currentLocale = stored as Locale;
  }
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  saveString(LOCALE_KEY, locale);
  notifyAll();
}

export function hasStoredLocale(): boolean {
  if (typeof window === "undefined") return true;
  return !!loadString(LOCALE_KEY);
}

function getDictionary(locale: Locale): Dictionary {
  try {
    return dictionaries[locale]();
  } catch {
    return ja;
  }
}

export function t(key: string, locale?: Locale): string {
  const l = locale ?? getLocale();
  const dict = getDictionary(l);
  return dict[key] ?? ja[key] ?? key;
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getLocale(),
    () => DEFAULT_LOCALE,
  );
}

export function useT() {
  const locale = useLocale();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  return useCallback(
    (key: string): string => dict[key] ?? ja[key] ?? key,
    [dict],
  );
}
