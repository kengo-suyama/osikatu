"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { isApiMode } from "@/lib/config";
import { circleRepo } from "@/lib/repo/circleRepo";

type TransferItem = {
  id: string;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
};

const sampleTransfers: TransferItem[] = [
  { id: "tr_1", fromMemberId: 13, toMemberId: 12, amount: 3000 },
  { id: "tr_2", fromMemberId: 11, toMemberId: 12, amount: 5200 },
];

const formatAmountPlain = (amount: number) => String(Math.max(0, Math.round(amount)));
const formatAmountYen = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.round(amount)))}円`;

const buildMessage = (params: {
  circleName?: string | null;
  toMemberId: number;
  amount: number;
}) => {
  const circle = params.circleName?.trim() || "サークル";
  const yen = formatAmountYen(params.amount);
  return `${circle}の精算：#${params.toMemberId}へ${yen}お願いします`;
};

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function CircleSettlementsPage({
  params,
}: {
  params: { circleId: string };
}) {
  const circleId = Number(params.circleId);
  const [circleName, setCircleName] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const transfers = useMemo(
    () => (isApiMode() ? [] : sampleTransfers),
    []
  );

  useEffect(() => {
    let mounted = true;
    if (!Number.isFinite(circleId)) return;
    circleRepo
      .get(circleId)
      .then((circle) => {
        if (!mounted) return;
        setCircleName(circle.name ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setCircleName(null);
      });
    return () => {
      mounted = false;
    };
  }, [circleId]);

  const showToast = (title: string, description: string) => {
    setToastTitle(title);
    setToastDescription(description);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  };

  const handleCopyAmount = async (amount: number) => {
    await copyText(formatAmountPlain(amount));
    showToast("コピーしました", "金額をコピーしました。");
  };

  const handleCopyMessage = async (toMemberId: number, amount: number) => {
    await copyText(buildMessage({ circleName, toMemberId, amount }));
    showToast("コピーしました", "送金メッセージをコピーしました。");
  };

  const handleOpenPayPay = () => {
    if (typeof window === "undefined") return;
    window.open("https://paypay.ne.jp/", "_blank", "noopener,noreferrer");
  };

  return (
    <ToastProvider>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <div>
          <div className="text-lg font-semibold">割り勘（精算）</div>
          <div className="mt-1 text-xs text-muted-foreground">
            PayPay IDなどの個人情報は保存しません。
          </div>
        </div>

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="text-sm font-semibold text-muted-foreground">精算結果</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {isApiMode()
              ? "精算結果は準備中です。"
              : "ローカルモードではサンプル結果を表示しています。"}
          </div>

          <div className="mt-4 space-y-3">
            {transfers.length ? (
              transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-2xl border border-border/60 bg-background/90 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">#{transfer.fromMemberId}</span>
                      <span className="px-1 text-muted-foreground">→</span>
                      <span className="font-semibold">#{transfer.toMemberId}</span>
                    </div>
                    <div className="text-base font-semibold">
                      {formatAmountYen(transfer.amount)}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCopyAmount(transfer.amount)}
                    >
                      金額コピー
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        handleCopyMessage(transfer.toMemberId, transfer.amount)
                      }
                    >
                      メッセージコピー
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={handleOpenPayPay}
                    >
                      PayPayを開く
                    </Button>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    例: {buildMessage({
                      circleName,
                      toMemberId: transfer.toMemberId,
                      amount: transfer.amount,
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                精算結果がまだありません。
              </div>
            )}
          </div>
        </Card>

        <div>
          <Link href={`/circles/${params.circleId}`} className="text-sm underline">
            サークルHomeへ戻る
          </Link>
        </div>
      </div>

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        <div className="space-y-1">
          <ToastTitle>{toastTitle}</ToastTitle>
          <ToastDescription>{toastDescription}</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

