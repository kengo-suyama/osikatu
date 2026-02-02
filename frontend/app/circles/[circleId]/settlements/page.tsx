"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { settlementRepo } from "@/lib/repo/settlementRepo";
import type { MemberBriefDto, SettlementDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatAmountPlain = (amount: number) => String(Math.max(0, Math.round(amount)));
const formatAmountYen = (amount: number) =>
  `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.round(amount)))}円`;

const buildMessage = (params: {
  circleName?: string | null;
  toMemberLabel: string;
  amount: number;
}) => {
  const circle = params.circleName?.trim() || "サークル";
  const yen = formatAmountYen(params.amount);
  return `${circle}の精算：${params.toMemberLabel}へ${yen}お願いします`;
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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [circleName, setCircleName] = useState<string | null>(null);
  const [circleRole, setCircleRole] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberBriefDto[]>([]);
  const [settlements, setSettlements] = useState<SettlementDto[]>([]);
  const [activeSettlement, setActiveSettlement] = useState<SettlementDto | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const [title, setTitle] = useState("");
  const [settledAt, setSettledAt] = useState(today);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const canUseSettlements =
    plan === "plus" && (circleRole === "owner" || circleRole === "admin");

  const amountNumber = Number(amount || 0);
  const participantCount = selectedMembers.length;
  const previewShare =
    participantCount > 0 ? Math.ceil(amountNumber / participantCount) : 0;
  const previewDiff = previewShare * participantCount - amountNumber;

  const resolveMemberUserId = (member: MemberBriefDto) =>
    typeof member.userId === "number" ? member.userId : member.id;

  const resolveMemberLabel = (userId: number) => {
    const member = members.find((item) => resolveMemberUserId(item) === userId);
    return member?.nickname ?? member?.initial ?? `#${userId}`;
  };

  useEffect(() => {
    let mounted = true;
    if (!Number.isFinite(circleId)) return;

    setLoading(true);
    setError(null);

    Promise.all([circleRepo.get(circleId), meRepo.getMe()])
      .then(async ([circle, me]) => {
        if (!mounted) return;
        if (!circle) {
          setCircleName(null);
          setCircleRole(null);
          setPlan(me.plan ?? "free");
          setMembers([]);
          setSettlements([]);
          setActiveSettlement(null);
          setError("このサークルは存在しません");
          return;
        }
        setCircleName(circle.name ?? null);
        setCircleRole(circle.myRole ?? null);
        setPlan(me.plan ?? "free");

        const allowed =
          me.plan === "plus" && (circle.myRole === "owner" || circle.myRole === "admin");
        if (!allowed) {
          setMembers([]);
          setSettlements([]);
          setActiveSettlement(null);
          return;
        }

        const list = await settlementRepo.list(circleId);
        if (!mounted) return;
        setMembers(list.members ?? []);
        setSettlements(list.items ?? []);
        const first = list.items?.[0] ?? null;
        setActiveSettlement(first);
        if (list.members?.length) {
          setSelectedMembers(list.members.map((item) => resolveMemberUserId(item)));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("精算データを取得できませんでした");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [circleId]);

  useEffect(() => {
    let mounted = true;
    if (!activeSettlement?.id) return;
    settlementRepo
      .get(circleId, activeSettlement.id)
      .then((detail) => {
        if (!mounted || !detail) return;
        setActiveSettlement(detail);
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, [circleId, activeSettlement?.id]);

  const showToast = (textTitle: string, description: string) => {
    setToastTitle(textTitle);
    setToastDescription(description);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  };

  const handleCopyAmount = async (amount: number) => {
    await copyText(formatAmountPlain(amount));
    showToast("コピーしました", "金額をコピーしました。");
  };

  const handleCopyMessage = async (toMemberId: number, amount: number) => {
    await copyText(
      buildMessage({
        circleName,
        toMemberLabel: resolveMemberLabel(toMemberId),
        amount,
      })
    );
    showToast("コピーしました", "送金メッセージをコピーしました。");
  };

  const handleOpenPayPay = () => {
    if (typeof window === "undefined") return;
    window.open("https://paypay.ne.jp/", "_blank", "noopener,noreferrer");
  };

  const toggleMember = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!canUseSettlements) return;
    if (!title.trim()) {
      showToast("入力不足", "タイトルを入力してください。");
      return;
    }
    if (!settledAt) {
      showToast("入力不足", "日付を選択してください。");
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      showToast("入力不足", "金額を入力してください。");
      return;
    }
    if (selectedMembers.length === 0) {
      showToast("入力不足", "参加メンバーを選択してください。");
      return;
    }

    setActionLoading(true);
    try {
      const created = await settlementRepo.create({
        circleId,
        title: title.trim(),
        settledAt,
        amount: amountNumber,
        participantUserIds: selectedMembers,
      });
      setSettlements((prev) => [created, ...prev]);
      setActiveSettlement(created);
      showToast("保存しました", "精算を登録しました。");
      setTitle("");
      setAmount("");
    } catch {
      showToast("保存失敗", "精算の登録に失敗しました。");
    } finally {
      setActionLoading(false);
    }
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

        {loading ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            読み込み中…
          </Card>
        ) : error ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            {error}
          </Card>
        ) : !canUseSettlements ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            Plusのオーナー/管理者のみご利用いただけます。
          </Card>
        ) : (
          <Card className="rounded-2xl border p-4 shadow-sm">
            <div className="text-sm font-semibold text-muted-foreground">立替登録</div>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">日付</div>
                <Input
                  type="date"
                  value={settledAt}
                  onChange={(event) => setSettledAt(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">タイトル</div>
                <Input
                  placeholder="例: 遠征交通費"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">金額</div>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="例: 12000"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">参加メンバー</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => {
                    const memberUserId = resolveMemberUserId(member);
                    const selected = selectedMembers.includes(memberUserId);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(memberUserId)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          selected
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                            : "border-border/60 text-muted-foreground"
                        )}
                      >
                        {member.nickname ?? member.initial ?? `#${member.id}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              均等割（切り上げ）: 1人あたり {formatAmountYen(previewShare)}
              {previewDiff > 0 ? ` / 端数差 ${formatAmountYen(previewDiff)}` : ""}
            </div>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={actionLoading}
              >
                精算を登録
              </Button>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-muted-foreground">精算結果</div>
            {settlements.length ? (
              <div className="text-xs text-muted-foreground">直近{settlements.length}件</div>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {settlements.length ? (
              settlements.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full rounded-xl border border-border/60 px-3 py-2 text-left text-sm",
                    activeSettlement?.id === item.id && "bg-muted/40"
                  )}
                  onClick={() => setActiveSettlement(item)}
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.settledAt ?? "未設定"} · {formatAmountYen(item.amount)}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                精算結果がまだありません。
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {activeSettlement?.transfers?.length ? (
              activeSettlement.transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="rounded-2xl border border-border/60 bg-background/90 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">
                        {resolveMemberLabel(transfer.fromUserId)}
                      </span>
                      <span className="px-1 text-muted-foreground">→</span>
                      <span className="font-semibold">
                        {resolveMemberLabel(transfer.toUserId)}
                      </span>
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
                        handleCopyMessage(transfer.toUserId, transfer.amount)
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
                      toMemberLabel: resolveMemberLabel(transfer.toUserId),
                      amount: transfer.amount,
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">精算結果を選択してください。</div>
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

