"use client";

import { useCallback, useEffect, useState } from "react";

import { SealRevealModal } from "@/components/gacha/SealRevealModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gachaRepo } from "@/lib/repo/gachaRepo";
import type { GachaLogDto } from "@/lib/types";

const RARITY_COLORS: Record<string, string> = {
  R: "text-gray-600",
  SR: "text-blue-600",
  SSR: "text-purple-600",
  UR: "text-amber-500",
};

export default function Page() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<GachaLogDto[]>([]);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    const res = await gachaRepo.getHistory();
    if (res) {
      setHistory(res.items);
      setTotal(res.total);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-4" data-testid="gacha-page">
      {hydrated ? <span data-testid="gacha-hydrated" /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">封印札ガチャ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            神社モチーフの封印札を開封する演出（v1）。
          </p>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            data-testid="gacha-open-seal"
          >
            封印札を開く
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="gacha-history-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ガチャ履歴</CardTitle>
          {total > 0 ? (
            <span className="text-xs text-muted-foreground">{total}回</span>
          ) : null}
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="gacha-history-empty">
              まだガチャを引いていません
            </p>
          ) : (
            <ul className="space-y-2" data-testid="gacha-history-list">
              {history.map((log) => (
                <li key={log.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" data-testid="gacha-history-item">
                  <div>
                    <span className={`font-semibold ${RARITY_COLORS[log.rarity] ?? ""}`}>[{log.rarity}]</span>{" "}
                    <span>{log.itemKey}</span>
                    {log.isNew ? <span className="ml-1 text-xs text-green-600">NEW</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.createdAt ? new Date(log.createdAt).toLocaleDateString("ja-JP") : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SealRevealModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
