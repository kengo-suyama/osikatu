"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchTodayFortune } from "@/lib/repo/fortuneRepo";
import type { FortuneDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DailyLuckyClean({ compact = false }: { compact?: boolean }) {
  const [fortune, setFortune] = useState<FortuneDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    fetchTodayFortune()
      .then((data) => {
        if (!canceled) {
          setFortune(data);
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={cn("rounded-2xl border bg-card shadow-sm", compact ? "p-3" : "p-4")}>
        <div className="text-sm font-semibold text-muted-foreground">今日の運勢</div>
        <p className="mt-3 text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!fortune) {
    return (
      <div className={cn("rounded-2xl border bg-card shadow-sm", compact ? "p-3" : "p-4")}>
        <div className="text-sm font-semibold text-muted-foreground">今日の運勢</div>
        <p className="mt-3 text-sm text-muted-foreground">
          運勢を取得できませんでした。時間をおいて再読み込みしてください。
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", compact ? "p-3" : "p-4")}>
      <div className="text-sm font-semibold text-muted-foreground">今日の運勢</div>
      <div className={cn("mt-3 space-y-2 text-sm", compact && "mt-2 space-y-1 text-xs")}>
        <div className="flex items-center gap-2">
          <span className="font-semibold">ラッキーカラー</span>
          <span className="text-muted-foreground">{fortune.luckyColor}</span>
        </div>
        <div>
          <span className="font-semibold">ラッキーアイテム</span> {fortune.luckyItem}
        </div>
        <div>
          <span className="font-semibold">今日のメッセージ</span>
          <p className="text-muted-foreground">{fortune.message}</p>
        </div>
        <div>
          <span className="font-semibold">ラッキー行動</span> {fortune.goodAction}
        </div>
        <div>
          <span className="font-semibold">気をつけること</span> {fortune.badAction}
        </div>
      </div>
      <div className={cn("mt-3 text-sm", compact && "mt-2 text-xs")}>
        <Link href="/fortune" className="text-primary underline-offset-4 hover:underline">
          履歴を見る
        </Link>
      </div>
    </div>
  );
}
