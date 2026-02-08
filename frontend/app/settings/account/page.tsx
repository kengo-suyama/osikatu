"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function AccountSettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch("/api/me/account", { method: "DELETE" });
      setDeleted(true);
      setShowConfirm(false);
      // Clear local data
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
    } catch {
      setError("退会に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="account-deleted">
        <div className="text-lg font-semibold">退会完了</div>
        <Card className="rounded-2xl border p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            アカウントが削除されました。ご利用ありがとうございました。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="account-settings-page">
      <div className="text-lg font-semibold">アカウント設定</div>

      <Card className="rounded-2xl border p-6 shadow-sm">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-destructive">退会</div>
          <p className="text-xs text-muted-foreground">
            退会すると、アカウントが無効化されます。
            データは一定期間保持された後、削除されます。
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowConfirm(true)}
            data-testid="account-delete-btn"
          >
            退会する
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </Card>

      <div>
        <Link href="/settings" className="text-sm underline">設定に戻る</Link>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent data-testid="account-delete-confirm">
          <DialogHeader>
            <DialogTitle>本当に退会しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。アカウントが無効化されます。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              data-testid="account-delete-confirm-btn"
            >
              {deleting ? "削除中..." : "退会する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
