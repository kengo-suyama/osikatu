"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="status-page">
      <div>
        <div className="text-lg font-semibold">稼働状況</div>
        <div className="mt-1 text-xs text-muted-foreground">おしかつ サービスステータス</div>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="status-operational">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <div>
            <div className="text-sm font-semibold">正常稼働中</div>
            <div className="text-xs text-muted-foreground">すべてのサービスが正常に動作しています。</div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="text-sm font-semibold text-muted-foreground">障害時のご案内</div>
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>障害が発生した場合は、このページでお知らせします。</p>
          <p>緊急のお問い合わせは <Link href="/contact" className="underline">お問い合わせページ</Link> よりご連絡ください。</p>
        </div>
      </Card>

      <div>
        <Link href="/" className="text-sm underline">ホームへ戻る</Link>
      </div>
    </div>
  );
}
