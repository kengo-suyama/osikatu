"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="privacy-page">
      <div className="text-lg font-semibold">プライバシーポリシー</div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3 text-xs text-muted-foreground">
          <section>
            <div className="text-sm font-semibold text-foreground">収集する情報</div>
            <p>デバイスID、表示名、プロフィール情報、利用履歴を収集します。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">利用目的</div>
            <p>サービスの提供・改善、サポート対応に利用します。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">第三者提供</div>
            <p>決済処理のためStripeに必要な情報を提供します。それ以外の目的で第三者に提供することはありません。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">データの削除</div>
            <p>アカウント削除時に個人データは無効化され、一定期間後に完全に削除されます。</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">お問い合わせ</div>
            <p>プライバシーに関するお問い合わせは <Link href="/contact" className="underline">お問い合わせページ</Link> よりご連絡ください。</p>
          </section>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href="/terms" className="text-sm underline">利用規約</Link>
        <Link href="/" className="text-sm underline">ホームへ戻る</Link>
      </div>
    </div>
  );
}
