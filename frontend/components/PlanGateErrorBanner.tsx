"use client";

import Link from "next/link";

export function PlanGateErrorBanner({ message }: { message?: string }) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
      data-testid="plan-gate-error"
    >
      <div className="font-medium text-amber-900">
        {message || "この機能はPlusプランが必要です"}
      </div>
      <Link
        href="/pricing"
        className="mt-2 inline-block text-xs font-medium text-amber-700 underline"
        data-testid="plan-gate-upgrade-link"
      >
        プランを確認する
      </Link>
    </div>
  );
}
