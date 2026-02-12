"use client";

import { useEffect, useState } from "react";

import { SealRevealModal } from "@/components/gacha/SealRevealModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pointsRepo } from "@/lib/repo/pointsRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { apiSend } from "@/lib/repo/http";
import { isApiMode } from "@/lib/config";
import { getDeviceId } from "@/lib/device";

export default function Page() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [insufficient, setInsufficient] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // Fetch current balance
    pointsRepo.getMePoints().then((data) => {
      if (data) setBalance(data.balance);
    });
  }, []);

  const handlePull = async () => {
    if (pulling) return;
    setInsufficient(false);
    setPulling(true);

    if (!isApiMode()) {
      // Offline/mock: just open the modal
      setPulling(false);
      setOpen(true);
      return;
    }

    try {
      const result = await apiSend<{
        cost: number;
        balance: number;
        prize: { itemType: string; itemKey: string; rarity: string; isNew: boolean };
      }>("/api/me/gacha/pull", "POST", {}, {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      });
      setBalance(result.balance);
      setOpen(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "POINTS_INSUFFICIENT") {
        setInsufficient(true);
        const details = err.details as { balance?: number } | undefined;
        if (details?.balance != null) setBalance(details.balance);
      }
    } finally {
      setPulling(false);
    }
  };

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

          {balance !== null ? (
            <div
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
              data-testid="gacha-points-badge"
            >
              {balance}P
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void handlePull()}
            disabled={pulling}
            data-testid="gacha-open-seal"
          >
            {pulling ? "読み込み中..." : "封印札を開く"}
          </Button>

          {insufficient ? (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600"
              data-testid="gacha-insufficient"
            >
              ポイント不足です。ポイントを貯めてから再チャレンジしてください。
            </div>
          ) : null}
        </CardContent>
      </Card>

      <SealRevealModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
