"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Locale = "ja" | "en" | "ko" | "es" | "zh-Hant";

const LOCALES: { id: Locale; label: string }[] = [
  { id: "ja", label: "日本語" },
  { id: "en", label: "English" },
  { id: "ko", label: "한국어" },
  { id: "es", label: "Español" },
  { id: "zh-Hant", label: "繁體中文" },
];

const LOCALE_KEY = "osikatu:locale";

function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCALE_KEY) as Locale | null;
  } catch {
    return null;
  }
}

function setStoredLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {}
}

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Locale | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const stored = getStoredLocale();
    if (stored) setSelected(stored);
  }, []);

  const handleSelect = (locale: Locale) => {
    setSelected(locale);
  };

  const handleConfirm = () => {
    if (!selected) return;
    setStoredLocale(selected);
    router.push("/settings");
  };

  if (!hydrated) return null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6"
      data-testid="language-page"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Language / 言語</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select your preferred language
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {LOCALES.map((locale) => (
          <button
            key={locale.id}
            type="button"
            data-testid={`language-option-${locale.id}`}
            onClick={() => handleSelect(locale.id)}
            className={`rounded-xl border-2 px-4 py-3 text-left text-lg font-medium transition-colors ${
              selected === locale.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/60 text-foreground/80 hover:border-primary/50"
            }`}
          >
            {locale.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={handleConfirm}
        data-testid="language-confirm"
        className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-opacity disabled:opacity-40"
      >
        OK
      </button>
    </div>
  );
}
