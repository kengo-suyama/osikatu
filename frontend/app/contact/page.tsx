"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="contact-page">
      <div>
        <div className="text-lg font-semibold">お問い合わせ</div>
        <div className="mt-1 text-xs text-muted-foreground">おしかつ サポート</div>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">メール</div>
            <div className="mt-1 text-sm">
              <a href="mailto:support@osikatu.com" className="underline" data-testid="contact-email">
                support@osikatu.com
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-muted-foreground">対応時間</div>
            <div className="mt-1 text-xs text-muted-foreground">
              平日 10:00～18:00（土日祝日・年末年始を除く）
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-muted-foreground">お願い</div>
            <div className="mt-1 text-xs text-muted-foreground">
              お問い合わせの際は、デバイスIDと発生している問題をお書き添えください。
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="text-sm font-semibold text-muted-foreground">関連リンク</div>
        <div className="mt-2 space-y-1">
          <div><Link href="/status" className="text-sm underline">稼働状況</Link></div>
          <div><Link href="/pricing" className="text-sm underline">料金プラン</Link></div>
        </div>
      </Card>

      <div>
        <Link href="/" className="text-sm underline">ホームへ戻る</Link>
      </div>
    </div>
  );
}
