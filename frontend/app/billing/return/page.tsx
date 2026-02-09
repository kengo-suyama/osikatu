"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { meRepo } from "@/lib/repo/meRepo";

type ViewState = "loading" | "success" | "notYet" | "invalid" | "redirecting";

export default function BillingReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const once = useRef(false);
  const [view, setView] = useState<ViewState>("loading");

  useEffect(() => {
    // Guard against double effects (StrictMode / double navigation).
    if (once.current) return;
    once.current = true;

    if (status === "cancel") {
      setView("redirecting");
      router.replace("/pricing?billing=cancel");
      return;
    }

    if (status !== "success") {
      setView("invalid");
      return;
    }

    setView("loading");
    meRepo
      .getMe()
      .then((me) => {
        if (me && (me.plan === "plus" || me.effectivePlan === "plus")) {
          setView("success");
        } else {
          setView("notYet");
        }
      })
      .catch(() => setView("notYet"));
  }, [router, status]);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="billing-return-page">
      <div className="text-lg font-semibold">お支払いの結果</div>

      {view === "redirecting" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-return-cancel">
          <div className="text-sm font-semibold">キャンセルされました</div>
          <div className="mt-1 text-xs text-muted-foreground">料金ページへ戻ります...</div>
        </Card>
      )}

      {view === "loading" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-return-loading">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div>
              <div className="text-sm font-semibold">確認中...</div>
              <div className="text-xs text-muted-foreground">プラン反映を確認しています</div>
            </div>
          </div>
        </Card>
      )}

      {view === "success" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-return-success">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-emerald-500" />
            <div>
              <div className="text-sm font-semibold">Plusになりました！</div>
              <div className="text-xs text-muted-foreground">プランが反映されました。ありがとうございます。</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/home">
              <Button size="sm">ホームへ</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm">プランを見る</Button>
            </Link>
          </div>
        </Card>
      )}

      {view === "notYet" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-return-notyet">
          <div className="space-y-2">
            <div className="text-sm font-semibold">反映に少し時間がかかっています</div>
            <div className="text-xs text-muted-foreground">
              決済は完了している可能性があります。しばらくしてから再読み込みしてください。
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setView("loading");
                  meRepo
                    .getMe()
                    .then((me) => {
                      if (me && (me.plan === "plus" || me.effectivePlan === "plus")) {
                        setView("success");
                      } else {
                        setView("notYet");
                      }
                    })
                    .catch(() => setView("notYet"));
                }}
              >
                再読み込み
              </Button>
              <Link href="/billing/complete">
                <Button size="sm" variant="outline">反映待ちページへ</Button>
              </Link>
              <Link href="/contact">
                <Button size="sm" variant="ghost">お問い合わせ</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {view === "invalid" && (
        <Card className="rounded-2xl border p-6 shadow-sm" data-testid="billing-return-invalid">
          <div className="text-sm font-semibold">不明なステータスです</div>
          <div className="mt-2">
            <Link href="/pricing">
              <Button size="sm" variant="secondary">料金ページへ</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
