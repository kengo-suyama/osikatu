"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CelebrationLayer from "@/components/celebration/CelebrationLayer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CELEBRATION_AFTERGLOW_MS,
  CELEBRATION_DURATION_MS,
  getCelebrationPrefs,
  getCelebrationTheme,
  getUserBirthday,
  hasCelebrationShown,
  markCelebrationShown,
} from "@/lib/celebrations";
import { EVENTS } from "@/lib/events";
import type { CelebrationPrefs } from "@/lib/types";
import type { Anniversary } from "@/lib/uiTypes";

type CelebrationTriggerProps = {
  oshiName?: string | null;
  oshiBirthday?: string | null;
  anniversaries?: Anniversary[];
};

export default function CelebrationTrigger({
  oshiName,
  oshiBirthday,
  anniversaries = [],
}: CelebrationTriggerProps) {
  const [prefs, setPrefs] = useState<CelebrationPrefs | null>(null);
  const [userBirthday, setUserBirthday] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const lastAutoKeyRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPrefs(getCelebrationPrefs());
    setUserBirthday(getUserBirthday());

    const handleChange = () => {
      setPrefs(getCelebrationPrefs());
      setUserBirthday(getUserBirthday());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) return;
      if (event.key.startsWith("osikatu:celebration") || event.key === "osikatu:user:birthday") {
        handleChange();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.CELEBRATION_PREFS_CHANGE, handleChange);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.CELEBRATION_PREFS_CHANGE, handleChange);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  const theme = useMemo(() => {
    if (!prefs) return null;
    return getCelebrationTheme({
      prefs,
      oshiName,
      oshiBirthday: oshiBirthday ?? null,
      userBirthday,
      anniversaries,
    });
  }, [prefs, oshiName, oshiBirthday, userBirthday, anniversaries]);

  const triggerCelebration = useCallback(
    (reason: "auto" | "manual") => {
      if (!theme || !prefs?.enabled) return;
      setOpen(true);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      const duration =
        CELEBRATION_DURATION_MS[theme.intensity] + CELEBRATION_AFTERGLOW_MS;
      timerRef.current = window.setTimeout(() => setOpen(false), duration);
      if (reason === "auto" && prefs.muteAfterShown) {
        markCelebrationShown(theme.onceKey);
      }
    },
    [prefs?.enabled, prefs?.muteAfterShown, theme]
  );

  useEffect(() => {
    if (!theme || !prefs?.enabled) return;
    if (prefs.muteAfterShown && hasCelebrationShown(theme.onceKey)) return;
    if (lastAutoKeyRef.current === theme.onceKey) return;
    lastAutoKeyRef.current = theme.onceKey;
    triggerCelebration("auto");
  }, [theme, prefs, triggerCelebration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!theme) return null;

  return (
    <>
      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Celebration
            </div>
            <div className="text-lg font-semibold">{theme.title}</div>
            {theme.subtitle ? (
              <div className="text-xs text-muted-foreground">{theme.subtitle}</div>
            ) : null}
          </div>
          <Button size="sm" onClick={() => triggerCelebration("manual")} disabled={!prefs?.enabled}>
            もう一回祝う
          </Button>
        </div>
        {!prefs?.enabled ? (
          <div className="pt-2 text-xs text-muted-foreground">
            演出がオフになっています
          </div>
        ) : null}
      </Card>
      <CelebrationLayer open={open} theme={theme} />
    </>
  );
}
