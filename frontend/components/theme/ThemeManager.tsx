"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { circleRepo } from "@/lib/repo/circleRepo";
import { applyTheme, getStoredThemeId } from "@/lib/theme/uiTheme";
import type { ThemeId } from "@/src/theme/themes";

const parseCircleId = (pathname: string): number | null => {
  if (!pathname.startsWith("/circles/")) return null;
  const parts = pathname.split("/");
  if (parts.length < 3) return null;
  const id = Number(parts[2]);
  return Number.isNaN(id) ? null : id;
};

export default function ThemeManager() {
  const pathname = usePathname();
  const [userThemeId, setUserThemeId] = useState<ThemeId>(() => getStoredThemeId());
  const [circleThemeId, setCircleThemeId] = useState<string | null>(null);

  const circleId = useMemo(() => parseCircleId(pathname), [pathname]);
  const isCirclePage = circleId !== null;

  useEffect(() => {
    const handle = () => {
      setUserThemeId(getStoredThemeId());
    };
    const handleCircleUi = (event: Event) => {
      const detail = (event as CustomEvent<{ circleId: number; ui?: { circleThemeId?: string | null } }>).detail;
      if (circleId !== null && detail?.circleId === circleId) {
        setCircleThemeId(detail.ui?.circleThemeId ?? null);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ui-theme-change", handle);
      window.addEventListener("circle-ui-change", handleCircleUi);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ui-theme-change", handle);
        window.removeEventListener("circle-ui-change", handleCircleUi);
      }
    };
  }, [circleId]);

  useEffect(() => {
    let cancelled = false;
    if (!isCirclePage || circleId === null) {
      setCircleThemeId(null);
      return;
    }

    circleRepo
      .get(circleId)
      .then((circle) => {
        if (cancelled) return;
        setCircleThemeId(circle.ui?.circleThemeId ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setCircleThemeId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [circleId, isCirclePage]);

  useEffect(() => {
    const effectiveThemeId =
      isCirclePage && circleThemeId ? circleThemeId : userThemeId;
    applyTheme(effectiveThemeId as ThemeId);
  }, [circleThemeId, isCirclePage, userThemeId]);

  return null;
}
