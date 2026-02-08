"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { meRepo } from "@/lib/repo/meRepo";

type SyncStatus = "polling" | "synced" | "timeout";

const MAX_POLLS = 12;
const POLL_INTERVAL = 5000;

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
        const me = await meRepo.getMe();
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
      <div className="text-lg font-semibold">決済完了</div>

      {status === "polling" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-sync-status" data-status="polling">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div>
              <div className="text-sm font-semibold">プラン反映待ち...</div>
              <div className="text-xs text-muted-foreground">
                Stripeからの確認を待っています。しばらくお待ちください。({pollCount}/{MAX_POLLS})
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
              <div className="text-sm font-semibold">プランが反映されました！</div>
              <div className="text-xs text-muted-foreground">
                Plusプランが有効になりました。すべての機能をお楽しみください。
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/">
              <Button size="sm">ホームへ</Button>
            </Link>
          </div>
        </Card>
      )}

      {status === "timeout" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-sync-status" data-status="timeout">
          <div className="space-y-2">
            <div className="text-sm font-semibold">反映に時間がかかっています</div>
            <div className="text-xs text-muted-foreground">
              決済は完了していますが、プランの反映に時間がかかっています。
              しばらく待っても反映されない場合は、お問い合わせください。
            </div>
            <div className="flex gap-2 pt-2">
              <Link href="/contact">
                <Button variant="outline" size="sm">お問い合わせ</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">ホームへ</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
