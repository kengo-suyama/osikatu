"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Home,
  Settings,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/log", label: "ログ", icon: ClipboardList },
  { href: "/money", label: "お金", icon: Wallet },
  { href: "/schedule", label: "予定", icon: CalendarDays },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur">
      <div className="mx-auto grid max-w-[430px] grid-cols-5 px-2 py-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "rounded-full p-1.5",
                  active ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
