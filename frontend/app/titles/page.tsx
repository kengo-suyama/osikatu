"use client";

import { useEffect, useMemo, useState } from "react";

import { isApiMode } from "@/lib/config";
import { oshiActionRepo } from "@/lib/repo/oshiActionRepo";
import {
  getTitleHistory,
  getTitleStats,
  type TitleHistoryItem,
  type TitleStats,
} from "@/lib/titles/titleState";
import { TITLES_JA_1000_UNIVERSAL } from "@/lib/titles/titles_ja_1000_universal";
import type { TitleAwardDto } from "@/lib/types";

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
  const [apiAwards, setApiAwards] = useState<TitleAwardDto[]>([]);

  useEffect(() => {
    if (!isApiMode()) {
      setHistory(getTitleHistory());
      setStats(getTitleStats());
      return;
    }

    oshiActionRepo
      .getTitles()
      .then((data) => {
        if (!data) return;
        setApiAwards(data.awards ?? []);
      })
      .catch(() => {
        setApiAwards([]);
      });
  }, []);

  const apiStats = useMemo(() => {
    if (!isApiMode()) return null;
    const ids = new Set(apiAwards.map((award) => award.titleId));
    const entries = apiAwards
      .map((award) => TITLES_JA_1000_UNIVERSAL.find((entry) => entry.id === award.titleId))
      .filter((entry): entry is (typeof TITLES_JA_1000_UNIVERSAL)[number] => Boolean(entry));
    const rarityOrder = ["common", "rare", "epic", "legendary"];
    const bestRarity =
      entries.reduce((best, entry) => {
        if (rarityOrder.indexOf(entry.rarity) > rarityOrder.indexOf(best)) {
          return entry.rarity;
        }
        return best;
      }, "common") ?? "common";
    return {
      uniqueTitlesCount: ids.size,
      bestRarityEver: bestRarity as TitleStats["bestRarityEver"],
      totalEarnedCount: apiAwards.length,
      seenTitleTexts: entries.map((entry) => entry.title),
      lastEarnedDate: apiAwards[0]?.awardedAt ?? null,
    } satisfies TitleStats;
  }, [apiAwards]);

  const apiHistory = useMemo<TitleHistoryItem[]>(() => {
    if (!isApiMode()) return [];
    return apiAwards.map((award) => {
      const entry =
        TITLES_JA_1000_UNIVERSAL.find((item) => item.id === award.titleId) ?? null;
      return {
        dateKey: award.awardedAt ? award.awardedAt.slice(0, 10) : "",
        titleText: entry?.title ?? award.titleId,
        rarity: entry?.rarity ?? "common",
        tags: entry?.tags ?? [],
      };
    });
  }, [apiAwards]);

  const viewStats = isApiMode() ? apiStats : stats;
  const viewHistory = isApiMode() ? apiHistory : history;

  return (
    <main className="px-4 pb-6 pt-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-muted-foreground">称号履歴</h1>
        </div>
        {viewStats ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">ユニーク</div>
              <div className="mt-1 text-sm font-semibold">
                {viewStats.uniqueTitlesCount}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">最高レア</div>
              <div className="mt-1 text-sm font-semibold">
                {rarityLabel[viewStats.bestRarityEver] ?? viewStats.bestRarityEver}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3 text-center text-xs">
              <div className="text-[10px] text-muted-foreground">累計</div>
              <div className="mt-1 text-sm font-semibold">
                {viewStats.totalEarnedCount}
              </div>
            </div>
          </div>
        ) : null}
        {viewHistory.length === 0 ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            まだ称号履歴がありません。
          </div>
        ) : (
          <div className="space-y-2">
            {viewHistory.map((item) => (
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
