"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STORAGE_KEY = "osikatu:onboarding:completed";

export function OnboardingModal({ circleId }: { circleId?: number }) {
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
          <DialogTitle>\u304A\u3057\u304B\u3064\u3078\u3088\u3046\u3053\u305D\uFF01</DialogTitle>
          <DialogDescription>\u63A8\u3057\u6D3B\u3092\u3082\u3063\u3068\u697D\u3057\u304F\u3001\u4FBF\u5229\u306B\u3002</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">\u{1F4CC} \u30D4\u30F3</div>
            <div className="text-xs text-muted-foreground">\u96C6\u5408\u5834\u6240\u30FB\u6301\u3061\u7269\u30FB\u30C1\u30B1\u30C3\u30C8\u60C5\u5831\u3092\u56FA\u5B9A\u8868\u793A</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">\u{1F4C5} \u30AB\u30EC\u30F3\u30C0\u30FC</div>
            <div className="text-xs text-muted-foreground">\u30A4\u30D9\u30F3\u30C8\u4E88\u5B9A\u3092\u5171\u6709\u30FB\u63D0\u6848\u30FB\u627F\u8A8D</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-sm font-semibold">\u{1F4B0} \u5272\u308A\u52D8</div>
            <div className="text-xs text-muted-foreground">\u7ACB\u66FF\u8A18\u9332\u30FB\u6B8B\u9AD8\u30FB\u304A\u3059\u3059\u3081\u9001\u91D1\u3092\u81EA\u52D5\u8A08\u7B97</div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleClose} data-testid="onboarding-close">
            \u306F\u3058\u3081\u308B
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
