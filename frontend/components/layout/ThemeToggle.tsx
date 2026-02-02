"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getStoredThemeId,
  isDarkThemeId,
  setStoredThemeId,
} from "@/lib/theme/uiTheme";
import { meRepo } from "@/lib/repo/meRepo";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    const stored = getStoredThemeId();
    setTheme(isDarkThemeId(stored) ? "dark" : "light");
  }, []);

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        setStoredThemeId(next);
        void meRepo.updateUiSettings({ themeId: next });
      }}
      aria-label="Toggle theme"
    >
      {mounted && isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
