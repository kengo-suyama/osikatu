"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "osikatu:onboarding:completed";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent data-testid="onboarding-modal">
        <DialogHeader>
          <DialogTitle>おしかつへようこそ！</DialogTitle>
          <DialogDescription>推し活をもっと楽しく、便利に。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">ピン</div>
            <div className="text-xs text-muted-foreground">集合場所・持ち物・チケット情報を固定表示</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">カレンダー</div>
            <div className="text-xs text-muted-foreground">イベント予定を共有・提案・承認</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">割り勘</div>
            <div className="text-xs text-muted-foreground">立替記録・残高・おすすめ送金を自動計算</div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleClose} data-testid="onboarding-close">
            はじめる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
