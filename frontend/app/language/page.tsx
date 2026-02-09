"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LOCALES, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/dictionaries";
import { setStoredLocale, getStoredLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils";

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelected(getStoredLocale());
    setHydrated(true);
  }, []);

  const handleConfirm = () => {
    setStoredLocale(selected);
    router.push("/home");
  };

  return (
    <div
      className="flex min-h-[80vh] flex-col items-center justify-center p-4"
      data-testid="language-page"
    >
      {hydrated ? <span data-testid="language-hydrated" /> : null}
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("language.title", selected)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("language.description", selected)}
        </p>

        <div className="space-y-2">
          {LOCALES.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelected(loc.id)}
              data-testid={`language-option-${loc.id}`}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                selected === loc.id
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border/60 hover:bg-muted/50"
              )}
            >
              <span className="text-base">{loc.nativeName}</span>
              <span className="text-xs text-muted-foreground">{loc.label}</span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleConfirm}
          data-testid="language-confirm"
        >
          {t("language.confirm", selected)}
        </Button>
      </div>
    </div>
  );
}
