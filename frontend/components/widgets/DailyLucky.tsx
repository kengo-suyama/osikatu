"use client";

import { useEffect, useState } from "react";

import { getDailyLucky } from "@/lib/lucky";
import type { LuckyData } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

export default function DailyLucky({ compact = false }: { compact?: boolean }) {
  const [lucky, setLucky] = useState<LuckyData | null>(null);

  useEffect(() => {
    setLucky(getDailyLucky());
  }, []);

  if (!lucky) return null;

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", compact ? "p-3" : "p-4")}>
      <div className="text-sm font-semibold text-muted-foreground">今日の占い</div>
      <div className={cn("mt-3 space-y-2 text-sm", compact && "mt-2 space-y-1 text-xs")}>
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: `hsl(${lucky.color.value})` }}
          />
          <span className="font-semibold">ラッキーカラー</span>
          <span className="text-muted-foreground">{lucky.color.name}</span>
        </div>
        <div>
          <span className="font-semibold">ラッキーナンバー</span> {lucky.number}
        </div>
        <div>
          <span className="font-semibold">ラッキー行動</span> {lucky.action}
        </div>
        <div>
          <span className="font-semibold">ラッキーアイテム</span> {lucky.item}
        </div>
      </div>
    </div>
  );
}
