"use client";

import { useCallback, useEffect, useState } from "react";

import CircleGachaCinematic from "@/components/gacha/CircleGachaCinematic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n";
import { isApiMode } from "@/lib/config";
import { ApiRequestError, apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";

type Prize = {
  itemType: string;
  itemKey: string;
  rarity: string;
  isNew: boolean;
};

type Stage = "idle" | "cinematic" | "result";

export default function CircleGachaPage({
  params,
}: {
  params: { circleId: string };
}) {
  const circleId = params.circleId;
  const { locale } = useLocale();
  const [stage, setStage] = useState<Stage>("idle");
  const [balance, setBalance] = useState<number | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!isApiMode()) return;
    apiGet<{ balance: number }>(`/api/circles/${circleId}/points`, {
      headers: { "X-Device-Id": getDeviceId() },
    })
      .then((data) => setBalance(data.balance))
      .catch(() => {});
  }, [circleId]);

  const handleStart = async () => {
    if (pulling) return;
    setError(null);
    setPulling(true);

    if (!isApiMode()) {
      setPrize({
        itemType: "frame",
        itemKey: "frame_pop_01",
        rarity: "R",
        isNew: true,
      });
      setPulling(false);
      setStage("cinematic");
      return;
    }

    try {
      const result = await apiSend<{
        cost: number;
        balance: number;
        prize: Prize;
      }>(`/api/circles/${circleId}/gacha/draw`, "POST", {}, {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      });
      setBalance(result.balance);
      setPrize(result.prize);
      setStage("cinematic");
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        err.code === "INSUFFICIENT_CIRCLE_POINTS"
      ) {
        setError("サークルポイントが不足しています");
        const details = err.details as { balance?: number } | undefined;
        if (details?.balance != null) setBalance(details.balance);
      } else {
        setError("ガチャに失敗しました");
      }
    } finally {
      setPulling(false);
    }
  };

  const handleCinematicComplete = useCallback(() => {
    setStage("result");
  }, []);

  const handleClose = () => {
    setStage("idle");
    setPrize(null);
    setError(null);
  };

  return (
    <div
      className="mx-auto max-w-xl space-y-4 px-4 py-6"
      data-testid="circle-gacha-page"
    >
      {stage === "idle" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">サークルガチャ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              サークルポイントを使って景品を獲得しよう。
            </p>

            {balance !== null ? (
              <div
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                data-testid="circle-gacha-points"
              >
                {balance} CP
              </div>
            ) : null}

            <Button
              type="button"
              onClick={() => void handleStart()}
              disabled={pulling || (balance !== null && balance < 100)}
              data-testid="circle-gacha-start"
            >
              {pulling ? "読み込み中..." : "ガチャを回す（100CP）"}
            </Button>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {stage === "cinematic" && (
        <CircleGachaCinematic
          locale={locale}
          onComplete={handleCinematicComplete}
        />
      )}

      {stage === "result" && prize && (
        <Card data-testid="circle-gacha-result">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="rounded-xl border p-4 text-center"
              data-testid="circle-gacha-result-item"
            >
              <div className="text-lg font-bold">{prize.itemKey}</div>
              <div className="text-sm text-muted-foreground">
                {prize.itemType} / {prize.rarity}
              </div>
              {prize.isNew ? (
                <div className="mt-1 text-xs text-emerald-600">NEW!</div>
              ) : null}
            </div>

            {balance !== null ? (
              <div className="text-xs text-muted-foreground">
                残り: {balance} CP
              </div>
            ) : null}

            <Button
              variant="secondary"
              onClick={handleClose}
              data-testid="circle-gacha-close"
            >
              閉じる
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
