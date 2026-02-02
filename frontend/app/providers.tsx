"use client";

import ThemeInitializer from "@/components/theme/ThemeInitializer";
import ThemeManager from "@/components/theme/ThemeManager";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      <ThemeManager />
      {children}
    </>
  );
}
