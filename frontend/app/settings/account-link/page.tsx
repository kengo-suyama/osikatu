"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export default function AccountLinkPage() {
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDesc, setToastDesc] = useState("");

  const showToast = (t: string, d: string) => {
    setToastTitle(t);
    setToastDesc(d);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  };

  const handleLink = async () => {
    if (!linkCode.trim()) {
      showToast("\u5165\u529B\u30A8\u30E9\u30FC", "\u9023\u643A\u30B3\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    setLoading(true);
    try {
      // Future: call auth link API
      showToast("\u9023\u643A\u5B8C\u4E86", "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u9023\u643A\u3055\u308C\u307E\u3057\u305F");
    } catch {
      showToast("\u9023\u643A\u5931\u6557", "\u30B3\u30FC\u30C9\u304C\u6B63\u3057\u304F\u306A\u3044\u304B\u3001\u671F\u9650\u5207\u308C\u3067\u3059");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToastProvider>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="account-link-page">
        <div>
          <div className="text-lg font-semibold">\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A</div>
          <div className="mt-1 text-xs text-muted-foreground">
            \u5225\u306E\u7AEF\u672B\u3068\u30A2\u30AB\u30A6\u30F3\u30C8\u3092\u9023\u643A\u3057\u307E\u3059
          </div>
        </div>

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="space-y-3">
            <div className="text-sm font-medium">\u9023\u643A\u30B3\u30FC\u30C9\u3092\u5165\u529B</div>
            <Input
              placeholder="\u4F8B: ABC-123-XYZ"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              data-testid="link-code-input"
            />
            <Button
              size="sm"
              onClick={handleLink}
              disabled={loading}
              data-testid="link-submit"
            >
              \u9023\u643A\u3059\u308B
            </Button>
          </div>
        </Card>

        <div>
          <Link href="/settings" className="text-sm underline">
            \u8A2D\u5B9A\u3078\u623B\u308B
          </Link>
        </div>
      </div>

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        <div className="space-y-1">
          <ToastTitle>{toastTitle}</ToastTitle>
          <ToastDescription>{toastDesc}</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
