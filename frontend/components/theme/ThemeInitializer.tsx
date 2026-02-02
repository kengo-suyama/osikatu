"use client";

import { useEffect } from "react";

import { applyTheme, getStoredThemeId } from "@/lib/theme/uiTheme";

export default function ThemeInitializer() {
  useEffect(() => {
    applyTheme(getStoredThemeId());
  }, []);

  return null;
}
