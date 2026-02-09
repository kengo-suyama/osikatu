"use client";

import { useCallback, useEffect, useState } from "react";

import { loadString, saveString } from "@/lib/storage";

import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

const LOCALE_KEY = "osikatu:locale";

export function getStoredLocale(): Locale {
  const stored = loadString(LOCALE_KEY);
  if (stored && isValidLocale(stored)) return stored;
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale): void {
  saveString(LOCALE_KEY, locale);
}

export function hasStoredLocale(): boolean {
  return loadString(LOCALE_KEY) !== null;
}

function isValidLocale(s: string): s is Locale {
  return ["ja", "en", "ko", "es", "zh-Hant"].includes(s);
}

export function useLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  hasChosen: boolean;
} {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hasChosen, setHasChosen] = useState(false);

  useEffect(() => {
    setLocaleState(getStoredLocale());
    setHasChosen(hasStoredLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setStoredLocale(l);
    setLocaleState(l);
    setHasChosen(true);
  }, []);

  return { locale, setLocale, hasChosen };
}
