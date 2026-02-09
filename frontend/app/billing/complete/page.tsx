"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { meRepo } from "@/lib/repo/meRepo";

type SyncStatus = "polling" | "synced" | "timeout";

const MAX_POLLS = 15;
const POLL_INTERVAL = 4000;

export default function BillingCompletePage() {
  const [status, setStatus] = useState<SyncStatus>("polling");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (status !== "polling") return;

    const timer = setInterval(async () => {
      setPollCount((c) => {
        const next = c + 1;
        if (next >= MAX_POLLS) {
          setStatus("timeout");
          clearInterval(timer);
          return next;
        }
        return next;
      });

      try {
        const me = await meRepo.refreshMe();
        if (me && (me.plan === "plus" || me.effectivePlan === "plus")) {
          setStatus("synced");
          clearInterval(timer);
        }
      } catch {
        // continue polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [status]);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="billing-complete-page">
      <div className="text-lg font-semibold">\u6c7a\u6e08\u5b8c\u4e86</div>

      {status === "polling" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-sync-status" data-status="polling">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div>
              <div className="text-sm font-semibold">\u30d7\u30e9\u30f3\u53cd\u6620\u5f85\u3061...</div>
              <div className="text-xs text-muted-foreground">
                Stripe\u304b\u3089\u306e\u78ba\u8a8d\u3092\u5f85\u3063\u3066\u3044\u307e\u3059\u3002\u3057\u3070\u3089\u304f\u304a\u5f85\u3061\u304f\u3060\u3055\u3044\u3002({pollCount}/{MAX_POLLS})
              </div>
            </div>
          </div>
        </Card>
      )}

      {status === "synced" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-sync-status" data-status="synced">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-emerald-500" />
            <div>
              <div className="text-sm font-semibold">\u30d7\u30e9\u30f3\u304c\u53cd\u6620\u3055\u308c\u307e\u3057\u305f\uff01</div>
              <div className="text-xs text-muted-foreground">
                Plus\u30d7\u30e9\u30f3\u304c\u6709\u52b9\u306b\u306a\u308a\u307e\u3057\u305f\u3002\u3059\u3079\u3066\u306e\u6a5f\u80fd\u3092\u304a\u697d\u3057\u307f\u304f\u3060\u3055\u3044\u3002
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/">
              <Button size="sm">\u30db\u30fc\u30e0\u3078</Button>
            </Link>
          </div>
        </Card>
      )}

      {status === "timeout" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-sync-status" data-status="timeout">
          <div className="space-y-2">
            <div className="text-sm font-semibold">\u53cd\u6620\u306b\u6642\u9593\u304c\u304b\u304b\u3063\u3066\u3044\u307e\u3059</div>
            <div className="text-xs text-muted-foreground">
              \u6c7a\u6e08\u306f\u5b8c\u4e86\u3057\u3066\u3044\u307e\u3059\u304c\u3001\u30d7\u30e9\u30f3\u306e\u53cd\u6620\u306b\u6642\u9593\u304c\u304b\u304b\u3063\u3066\u3044\u307e\u3059\u3002
              \u5c11\u3057\u6642\u9593\u3092\u304a\u3044\u3066\u518d\u8aad\u307f\u8fbc\u307f\u3057\u3066\u304f\u3060\u3055\u3044\u3002
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                data-testid="billing-sync-retry"
                onClick={() => {
                  setPollCount(0);
                  setStatus("polling");
                }}
              >
                \u518d\u8aad\u307f\u8fbc\u307f
              </Button>
              <Link href="/contact">
                <Button variant="outline" size="sm">\u304a\u554f\u3044\u5408\u308f\u305b</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">\u30db\u30fc\u30e0\u3078</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
