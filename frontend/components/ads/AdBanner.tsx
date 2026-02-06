"use client";

import { useMemo } from "react";

import { isApiMode } from "@/lib/config";
import { loadJson } from "@/lib/storage";
import type { MeDto } from "@/lib/types";

const ME_KEY = "osikatu:me";

const isAdsEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const envFlag = process.env.NEXT_PUBLIC_ADS_ENABLED;
  return envFlag === "1" || envFlag === "true";
};

const isFreeUser = (): boolean => {
  const stored = loadJson<MeDto>(ME_KEY);
  const plan = stored?.effectivePlan ?? stored?.plan ?? "free";
  return plan === "free";
};

export function AdBanner({ className = "" }: { className?: string }) {
  const shouldShow = useMemo(() => {
    if (!isAdsEnabled()) return false;
    if (!isFreeUser()) return false;
    return true;
  }, []);

  if (!shouldShow) return null;

  return (
    <div
      className={`rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-xs text-muted-foreground ${className}`}
      data-testid="ad-banner"
    >
      <div className="text-[10px] uppercase tracking-wider opacity-60">広告</div>
      <div className="mt-1">ここに広告が表示されます</div>
      <div className="mt-1 text-[10px] opacity-60">
        Plus/Premium にアップグレードすると非表示になります
      </div>
    </div>
  );
}
