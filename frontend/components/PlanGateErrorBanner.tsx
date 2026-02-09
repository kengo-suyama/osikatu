"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PlanGateErrorKind } from "@/lib/usePlanGateError";

export function PlanGateErrorBanner({
  message,
  kind = "upgrade",
}: {
  message?: string;
  kind?: PlanGateErrorKind;
}) {
  const isUpgrade = kind === "upgrade";
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        isUpgrade ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
      }`}
      data-testid="plan-gate-error"
    >
      <div className={`font-medium ${isUpgrade ? "text-amber-900" : "text-slate-900"}`}>
        {message || (isUpgrade ? "この機能はPlusプランが必要です" : "この操作を行う権限がありません")}
      </div>
      {isUpgrade ? (
        <div className="mt-3">
          <Link href="/pricing" data-testid="plan-gate-upgrade-link">
            <Button size="sm" variant="secondary" data-testid="plan-gate-upgrade">
              Upgrade
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
