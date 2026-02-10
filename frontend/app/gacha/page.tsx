"use client";

import { useCallback, useEffect, useState } from "react";

import { SealOfuda, type SealPhase } from "@/components/gacha/SealOfuda";
import {
  playGachaBell,
  playGachaPaperRip,
  playGachaReveal,
} from "@/lib/gachaSfx";
import { Button } from "@/components/ui/button";

type GachaStage = "start" | "cinematic" | "result";

const MOCK_PRIZES = [
  { id: "prize-1", name: "推し色キーホルダー", rarity: "R" },
  { id: "prize-2", name: "限定アクスタ", rarity: "SR" },
  { id: "prize-3", name: "サイン色紙", rarity: "SSR" },
];

export default function Page() {
  const [stage, setStage] = useState<GachaStage>("start");
  const [sealPhase, setSealPhase] = useState<SealPhase>("idle");
  const [prize, setPrize] = useState(MOCK_PRIZES[0]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleStart = useCallback(() => {
    setStage("cinematic");
    setSealPhase("idle");

    setTimeout(() => {
      setSealPhase("charge");
      playGachaBell();
    }, 400);
    setTimeout(() => {
      setSealPhase("crack");
    }, 1200);
    setTimeout(() => {
      setSealPhase("burst");
      playGachaPaperRip();
    }, 2000);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * MOCK_PRIZES.length);
      setPrize(MOCK_PRIZES[idx]);
      playGachaReveal();
      setStage("result");
    }, 2800);
  }, []);

  const handleClose = useCallback(() => {
    setStage("start");
    setSealPhase("idle");
  }, []);

  return (
    <div
      className="flex min-h-[80vh] flex-col items-center justify-center p-4"
      data-testid="gacha-page"
    >
      {hydrated ? <span data-testid="gacha-hydrated" /> : null}

      {stage === "start" && (
        <div className="space-y-6 text-center" data-testid="gacha-stage-start">
          <h1 className="text-2xl font-bold tracking-tight">封印札ガチャ</h1>
          <p className="text-sm text-muted-foreground">
            封印を解き放ち、景品をGETしよう
          </p>
          <Button
            type="button"
            size="lg"
            onClick={handleStart}
            data-testid="gacha-start"
          >
            開封する
          </Button>
        </div>
      )}

      {stage === "cinematic" && (
        <div className="w-full max-w-md" data-testid="gacha-cinematic">
          <SealOfuda phase={sealPhase} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            封印がほどけていく…
          </p>
        </div>
      )}

      {stage === "result" && (
        <div className="space-y-6 text-center" data-testid="gacha-result">
          <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            景品GET
          </h2>
          <div
            className="mx-auto max-w-xs rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 shadow-lg dark:border-amber-800 dark:from-amber-950/30 dark:to-slate-900"
            data-testid="gacha-result-item"
          >
            <div className="text-xs font-semibold tracking-wider text-amber-500">
              {prize.rarity}
            </div>
            <div className="mt-1 text-lg font-bold">{prize.name}</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            data-testid="gacha-close"
          >
            閉じる
          </Button>
        </div>
      )}
    </div>
  );
}
