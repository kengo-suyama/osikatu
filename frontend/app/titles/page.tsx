"use client";

import { useEffect, useState } from "react";

import { getTitleHistory, getTitleStats, type TitleHistoryItem, type TitleStats } from "@/lib/titles/titleState";

const formatDate = (dateKey: string) => dateKey;

const rarityLabel: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export default function TitlesPage() {
  const [history, setHistory] = useState<TitleHistoryItem[]>([]);
  const [stats, setStats] = useState<TitleStats | null>(null);

  useEffect(() => {
    setHistory(getTitleHistory());
    setStats(getTitleStats());
  }, []);

  return (
    <main className="px-4 pb-6 pt-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-muted-foreground">称号履歴</h1>
        </div>
        {stats ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">ユニーク</div>
              <div className="mt-1 text-sm font-semibold">{stats.uniqueTitlesCount}</div>
            </div>
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">最高レア</div>
              <div className="mt-1 text-sm font-semibold">
                {rarityLabel[stats.bestRarityEver] ?? stats.bestRarityEver}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">累計</div>
              <div className="mt-1 text-sm font-semibold">{stats.totalEarnedCount}</div>
            </div>
          </div>
        ) : null}
        {history.length === 0 ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            まだ称号履歴がありません。
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={`${item.dateKey}-${item.titleText}`}
                className="rounded-2xl border bg-card p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.titleText}</div>
                  <div className="text-xs text-muted-foreground">
                    {rarityLabel[item.rarity] ?? item.rarity}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(item.dateKey)}
                </div>
                {item.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-border/60 px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 ? (
                      <span className="rounded-full border border-border/60 px-2 py-0.5">
                        +{item.tags.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
