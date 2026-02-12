"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Home,
  Images,
  Settings,
  Wallet,
} from "lucide-react";

import AlbumModal from "@/components/album/AlbumModal";
import { t, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const [albumOpen, setAlbumOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur">
      <div className="mx-auto grid max-w-[430px] grid-cols-6 px-2 py-1">
        <Link
          href="/home"
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            pathname === "/home" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              pathname === "/home" ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <Home className="h-5 w-5" />
          </span>
          <span>{t("nav.home", locale)}</span>
        </Link>

        <Link
          href="/log"
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            pathname === "/log" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              pathname === "/log" ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <span>{t("nav.log", locale)}</span>
        </Link>

        <Link
          href="/money"
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            pathname === "/money" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              pathname === "/money" ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <Wallet className="h-5 w-5" />
          </span>
          <span>{t("nav.money", locale)}</span>
        </Link>

        <Link
          href="/schedule"
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            pathname === "/schedule" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              pathname === "/schedule" ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <CalendarDays className="h-5 w-5" />
          </span>
          <span>{t("nav.schedule", locale)}</span>
        </Link>

        <button
          type="button"
          onClick={() => setAlbumOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            albumOpen ? "text-primary" : "text-muted-foreground"
          )}
          data-testid="nav-album"
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              albumOpen ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <Images className="h-5 w-5" />
          </span>
          <span>{t("nav.album", locale)}</span>
        </button>

        <Link
          href="/settings"
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
            pathname === "/settings" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "rounded-full p-1.5",
              pathname === "/settings" ? "bg-[hsl(var(--accent))]/15" : "bg-transparent"
            )}
          >
            <Settings className="h-5 w-5" />
          </span>
          <span>{t("nav.settings", locale)}</span>
        </Link>
      </div>
      <AlbumModal open={albumOpen} onOpenChange={setAlbumOpen} />
    </nav>
  );
}
