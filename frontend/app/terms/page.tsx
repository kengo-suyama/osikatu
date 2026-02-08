"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="terms-page">
      <div className="text-lg font-semibold">利用規約</div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3 text-xs text-muted-foreground">
          <section>
            <div className="text-sm font-semibold text-foreground">第1条 適用</div>
            <p>本規約は、おしかつ（以下「本サービス」）の利用に関する条件を定めます。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">第2条 アカウント</div>
            <p>ユーザーはデバイスIDにより自動的にアカウントが作成されます。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">第3条 禁止事項</div>
            <p>以下の行為を禁止します。不正アクセス、サービスの妨害、第三者への迷惑行為。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">第4条 免責</div>
            <p>本サービスは現状有姇で提供されます。運営者はデータの消失等について責任を負いません。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">第5条 改定</div>
            <p>本規約は事前の通知なく変更される場合があります。</p>
          </section>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/privacy" className="text-sm underline">プライバシーポリシー</Link>
        <Link href="/" className="text-sm underline">ホームへ戻る</Link>
      </div>
    </div>
  );
}
