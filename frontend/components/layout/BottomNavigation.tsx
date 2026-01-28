"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ClipboardList, Home, Settings, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: ClipboardList },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
      <div className="mx-auto grid max-w-screen-sm grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
