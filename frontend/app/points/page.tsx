"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pointsRepo } from "@/lib/repo/pointsRepo";
import type { PointsTransactionItemDto } from "@/lib/types";

const REASON_LABELS: Record<string, string> = {
  daily_login: "デイリーログイン",
  share_copy: "シェア",
  gacha_pull_cost: "ガチャ",
  seed: "初期付与",
};

export default function Page() {
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<PointsTransactionItemDto[]>([]);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    const res = await pointsRepo.getHistory();
    if (res) {
      setBalance(res.balance);
      setItems(res.items);
      setTotal(res.total);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-4" data-testid="points-page">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ポイント</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" data-testid="points-balance">{balance}<span className="text-sm font-normal text-muted-foreground ml-1">pt</span></div>
        </CardContent>
      </Card>

      <Card data-testid="points-history-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ポイント履歴</CardTitle>
          {total > 0 ? (
            <span className="text-xs text-muted-foreground">{total}件</span>
          ) : null}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="points-history-empty">
              まだ履歴がありません
            </p>
          ) : (
            <ul className="space-y-2" data-testid="points-history-list">
              {items.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" data-testid="points-history-item">
                  <div>
                    <span className="font-medium">{REASON_LABELS[tx.reason] ?? tx.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={tx.delta >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-500"}>
                      {tx.delta >= 0 ? "+" : ""}{tx.delta}
                    </span>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("ja-JP") : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
