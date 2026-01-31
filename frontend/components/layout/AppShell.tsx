import type { ReactNode } from "react";

import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.12),_transparent_48%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(255,182,193,0.35),_transparent_45%),radial-gradient(circle_at_85%_0%,_rgba(255,220,170,0.25),_transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col pb-24">
        <AppHeader />
        <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
