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
import { circleSettlementExpenseRepo } from "@/lib/repo/circleSettlementExpenseRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { settlementRepo } from "@/lib/repo/settlementRepo";
import type {
  CircleSettlementBalancesDto,
  CircleSettlementExpenseDto,
  CircleSettlementSuggestionsDto,
  MemberBriefDto,
  SettlementDto,
} from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isApiMode } from "@/lib/config";

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

  const [expenseLedgerLoading, setExpenseLedgerLoading] = useState(false);
  const [expenseLedgerForbidden, setExpenseLedgerForbidden] = useState<string | null>(null);
  const [expenseLedgerError, setExpenseLedgerError] = useState<string | null>(null);
  const [expenseLedgerItems, setExpenseLedgerItems] = useState<CircleSettlementExpenseDto[]>(
    []
  );
  const [expenseLedgerBalances, setExpenseLedgerBalances] =
    useState<CircleSettlementBalancesDto | null>(null);
  const [expenseLedgerSuggestions, setExpenseLedgerSuggestions] =
    useState<CircleSettlementSuggestionsDto | null>(null);

  const [title, setTitle] = useState("");
  const [settledAt, setSettledAt] = useState(today);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const [showCreateExpenseDialog, setShowCreateExpenseDialog] = useState(false);
  const [ceTitle, setCeTitle] = useState("");
  const [ceAmountYen, setCeAmountYen] = useState("");
  const [ceSplitType, setCeSplitType] = useState<"equal" | "fixed">("equal");
  const [cePayerMemberId, setCePayerMemberId] = useState<number | null>(null);
  const [ceOccurredOn, setCeOccurredOn] = useState(today);
  const [ceParticipants, setCeParticipants] = useState<number[]>([]);
  const [ceLoading, setCeLoading] = useState(false);
  const [ceShares, setCeShares] = useState<Record<number, string>>({});

  const [showVoidReplaceDialog, setShowVoidReplaceDialog] = useState(false);
  const [vrTargetExpenseId, setVrTargetExpenseId] = useState<number | null>(null);
  const [vrTitle, setVrTitle] = useState("");
  const [vrAmountYen, setVrAmountYen] = useState("");
  const [vrSplitType, setVrSplitType] = useState<"equal" | "fixed">("equal");
  const [vrPayerMemberId, setVrPayerMemberId] = useState<number | null>(null);
  const [vrParticipants, setVrParticipants] = useState<number[]>([]);
  const [vrLoading, setVrLoading] = useState(false);
  const [vrShares, setVrShares] = useState<Record<number, string>>({});

  const ceTotal = Number(ceAmountYen) || 0;
  const ceFixedSum = Object.values(ceShares).reduce((s, v) => s + (Number(v) || 0), 0);
  const ceCreateError =
    ceSplitType === "fixed" && ceAmountYen && ceFixedSum !== ceTotal
      ? "個別指定の合計が金額と一致しません"
      : null;
  const ceCreateDisabled =
    ceLoading || !ceTitle.trim() || !ceAmountYen || ceTotal <= 0 || !cePayerMemberId ||
    (ceSplitType === "fixed" && ceFixedSum !== ceTotal);

  const vrTotal = Number(vrAmountYen) || 0;
  const vrFixedSum = Object.values(vrShares).reduce((s, v) => s + (Number(v) || 0), 0);
  const vrCreateError =
    vrSplitType === "fixed" && vrAmountYen && vrFixedSum !== vrTotal
      ? "個別指定の合計が金額と一致しません"
      : null;
  const vrCreateDisabled =
    vrLoading || !vrTitle.trim() || !vrAmountYen || vrTotal <= 0 || !vrPayerMemberId ||
    (vrSplitType === "fixed" && vrFixedSum !== vrTotal);

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

  const resolveLedgerMemberLabel = (memberId: number) => {
    const balanceName = expenseLedgerBalances?.items.find((item) => item.memberId === memberId);
    if (balanceName?.displayName) return balanceName.displayName;

    for (const expense of expenseLedgerItems) {
      const share = expense.shares?.find((item) => item.memberId === memberId);
      if (share?.memberSnapshotName) return share.memberSnapshotName;
    }

    return `#${memberId}`;
  };

  const resolveLedgerPayerLabel = (expense: CircleSettlementExpenseDto) =>
    resolveLedgerMemberLabel(expense.payerMemberId);

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
    if (!Number.isFinite(circleId)) return;

    setExpenseLedgerForbidden(null);
    setExpenseLedgerError(null);

    if (!isApiMode()) {
      setExpenseLedgerLoading(false);
      setExpenseLedgerItems([]);
      setExpenseLedgerBalances(null);
      setExpenseLedgerSuggestions(null);
      return;
    }

    setExpenseLedgerLoading(true);

    Promise.allSettled([
      circleSettlementExpenseRepo.list(circleId),
      circleSettlementExpenseRepo.balances(circleId),
      circleSettlementExpenseRepo.suggestions(circleId),
    ])
      .then((results) => {
        if (!mounted) return;

        const rejected = results.find(
          (item): item is PromiseRejectedResult => item.status === "rejected"
        );

        if (rejected?.reason instanceof ApiRequestError) {
          const apiErr = rejected.reason as ApiRequestError;
          if (apiErr.status === 402 || apiErr.code === "PLAN_REQUIRED") {
            setExpenseLedgerForbidden(apiErr.message || "Plusが必要です。");
            setExpenseLedgerItems([]);
            setExpenseLedgerBalances(null);
            setExpenseLedgerSuggestions(null);
            return;
          }
          if (apiErr.status === 403) {
            setExpenseLedgerForbidden(apiErr.message || "権限がありません。");
            setExpenseLedgerItems([]);
            setExpenseLedgerBalances(null);
            setExpenseLedgerSuggestions(null);
            return;
          }
          setExpenseLedgerError(apiErr.message || "割り勘データを取得できませんでした");
          return;
        }

        const listRes = results[0].status === "fulfilled" ? results[0].value : null;
        const balancesRes = results[1].status === "fulfilled" ? results[1].value : null;
        const suggestionsRes = results[2].status === "fulfilled" ? results[2].value : null;

        setExpenseLedgerItems(listRes?.items ?? []);
        setExpenseLedgerBalances(balancesRes);
        setExpenseLedgerSuggestions(suggestionsRes);
      })
      .catch(() => {
        if (!mounted) return;
        setExpenseLedgerError("割り勘データを取得できませんでした");
      })
      .finally(() => {
        if (!mounted) return;
        setExpenseLedgerLoading(false);
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

  const refreshExpenseLedger = async () => {
    try {
      const [listRes, balancesRes, suggestionsRes] = await Promise.all([
        circleSettlementExpenseRepo.list(circleId),
        circleSettlementExpenseRepo.balances(circleId),
        circleSettlementExpenseRepo.suggestions(circleId),
      ]);
      setExpenseLedgerItems(listRes.items ?? []);
      setExpenseLedgerBalances(balancesRes);
      setExpenseLedgerSuggestions(suggestionsRes);
    } catch {
      // ignore refresh errors
    }
  };

  const openCreateExpenseDialog = () => {
    setCeTitle("");
    setCeAmountYen("");
    setCeSplitType("equal");
    setCePayerMemberId(members[0]?.id ?? null);
    setCeOccurredOn(today);
    setCeParticipants(members.map((m) => m.id));
    setCeShares(Object.fromEntries(members.map((m) => [m.id, ""])));
    setShowCreateExpenseDialog(true);
  };

  const handleCreateExpense = async () => {
    if (!ceTitle.trim() || !ceAmountYen || !cePayerMemberId) return;
    setCeLoading(true);
    try {
      await circleSettlementExpenseRepo.create(circleId, {
        title: ceTitle.trim(),
        amountYen: Number(ceAmountYen),
        splitType: ceSplitType,
        payerMemberId: cePayerMemberId,
        occurredOn: ceOccurredOn || undefined,
        participants: ceSplitType === "equal" ? ceParticipants : undefined,
        shares: ceSplitType === "fixed"
          ? Object.entries(ceShares)
              .filter(([, v]) => Number(v) > 0)
              .map(([k, v]) => ({ memberId: Number(k), shareYen: Number(v) }))
          : undefined,
      });
      setShowCreateExpenseDialog(false);
      showToast("登録しました", "立替を登録しました。");
      await refreshExpenseLedger();
    } catch {
      showToast("登録失敗", "立替の登録に失敗しました。");
    } finally {
      setCeLoading(false);
    }
  };

  const handleVoidExpense = async (expenseId: number) => {
    try {
      await circleSettlementExpenseRepo.voidExpense(circleId, expenseId);
      showToast("取消しました", "立替を取消しました。");
      await refreshExpenseLedger();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) showToast("取消済み", "この立替は既に取消されています。");
        else if (err.status === 403) showToast("権限不足", "この操作は許可されていません。");
        else showToast("取消失敗", "立替の取消に失敗しました。");
      } else {
        showToast("取消失敗", "立替の取消に失敗しました。");
      }
    }
  };

  const openVoidReplaceDialog = (expense: CircleSettlementExpenseDto) => {
    setVrTargetExpenseId(expense.id);
    setVrTitle(expense.title);
    setVrAmountYen(String(expense.amountYen));
    setVrSplitType(expense.splitType === "fixed" ? "fixed" : "equal");
    setVrPayerMemberId(expense.payerMemberId);
    setVrParticipants(expense.shares.map((s) => s.memberId));
    setVrShares(Object.fromEntries(expense.shares.map((s) => [s.memberId, String(s.shareYen)])));
    setShowVoidReplaceDialog(true);
  };

  const handleVoidReplace = async () => {
    if (!vrTargetExpenseId || !vrTitle.trim() || !vrAmountYen || !vrPayerMemberId) return;
    setVrLoading(true);
    try {
      await circleSettlementExpenseRepo.voidExpense(circleId, vrTargetExpenseId, {
        title: vrTitle.trim(),
        amountYen: Number(vrAmountYen),
        splitType: vrSplitType,
        payerMemberId: vrPayerMemberId,
        occurredOn: today,
        participants: vrSplitType === "equal" ? vrParticipants : undefined,
        shares: vrSplitType === "fixed"
          ? Object.entries(vrShares)
              .filter(([, v]) => Number(v) > 0)
              .map(([k, v]) => ({ memberId: Number(k), shareYen: Number(v) }))
          : undefined,
      });
      setShowVoidReplaceDialog(false);
      showToast("置換しました", "立替を取消して新しい立替に置換しました。");
      await refreshExpenseLedger();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409) showToast("取消済み", "この立替は既に取消されています。");
        else if (err.status === 422) showToast("入力エラー", err.message || "入力内容を確認してください。");
        else if (err.status === 403) showToast("権限不足", "この操作は許可されていません。");
        else showToast("置換失敗", "立替の置換に失敗しました。");
      } else {
        showToast("置換失敗", "立替の置換に失敗しました。");
      }
    } finally {
      setVrLoading(false);
    }
  };

  const toggleVrParticipant = (id: number) => {
    setVrParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCeParticipant = (id: number) => {
    setCeParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="settlement-page">
        <div data-testid="settlement-page-header">
          <div className="text-lg font-semibold">割り勘（精算）</div>
          <div className="mt-1 text-xs text-muted-foreground">
            PayPay IDなどの個人情報は保存しません。
          </div>
        </div>

        {expenseLedgerForbidden ? (
          <Card
            className="rounded-2xl border p-4 text-sm text-muted-foreground"
            data-testid="settlement-forbidden"
          >
            {expenseLedgerForbidden}
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border p-4 shadow-sm" data-testid="settlement-expenses">
              <div className="text-sm font-semibold text-muted-foreground">割り勘（台帳）</div>
              <div className="mt-1 text-xs text-muted-foreground">
                立替を記録して、残高とおすすめ送金を表示します。
              </div>
              {canUseSettlements && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  data-testid="settlement-create-open"
                  onClick={openCreateExpenseDialog}
                >
                  立替を追加
                </Button>
              )}

              {expenseLedgerLoading ? (
                <div className="mt-3 text-sm text-muted-foreground">読み込み中…</div>
              ) : expenseLedgerError ? (
                <div className="mt-3 text-sm text-muted-foreground">{expenseLedgerError}</div>
              ) : (
                <div className="mt-3 space-y-2" data-testid="settlement-expenses-loaded" data-count={expenseLedgerItems.length}>
                  {expenseLedgerItems.length ? (
                    expenseLedgerItems.slice(0, 10).map((expense) => (
                      <div
                        key={expense.id}
                        className="rounded-xl border border-border/60 bg-background/90 px-3 py-2 text-sm"
                        data-testid={`settlement-expense-${expense.id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                          <div className="font-medium">{expense.title || "(無題)"}</div>
                          {expense.voidedAt && (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="settlement-expense-status">取消済</span>
                          )}
                          {expense.replacedByExpenseId && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="settlement-expense-replaced">置換済</span>
                          )}
                        </div>
                          <div className="font-semibold">
                            {formatAmountYen(expense.amountYen)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {expense.occurredOn ?? "日付未設定"} · 支払:{" "}
                            {resolveLedgerPayerLabel(expense)}
                          </span>
                          {canUseSettlements && (
                            <span className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-rose-500 hover:text-rose-600"
                                data-testid="settlement-expense-void"
                                onClick={() => handleVoidExpense(expense.id)}
                              >
                                取消
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-amber-500 hover:text-amber-600"
                                data-testid="settlement-expense-void-replace-open"
                                onClick={() => openVoidReplaceDialog(expense)}
                              >
                                置換
                              </Button>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                      立替がまだありません。
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border p-4 shadow-sm" data-testid="settlement-balances">
              <div className="text-sm font-semibold text-muted-foreground">残高</div>
              {!expenseLedgerBalances?.items?.length ? (
                <div className="mt-3 text-sm text-muted-foreground">データがありません。</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {expenseLedgerBalances.items.map((item) => (
                    <div
                      key={item.memberId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
                      data-testid={`settlement-balance-${item.memberId}`}
                    >
                      <div className="font-medium">{item.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        立替 {formatAmountYen(item.paidYen)} / 負担{" "}
                        {formatAmountYen(item.owedYen)}
                      </div>
                      <div
                        className={cn(
                          "font-semibold",
                          item.netYen > 0 && "text-emerald-600",
                          item.netYen < 0 && "text-rose-600"
                        )}
                      >
                        {item.netYen >= 0 ? "+" : "-"}
                        {formatAmountYen(Math.abs(item.netYen))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {expenseLedgerBalances?.totals ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  合計 {formatAmountYen(expenseLedgerBalances.totals.totalExpensesYen)} ·{" "}
                  {expenseLedgerBalances.totals.expenseCount}件
                </div>
              ) : null}
            </Card>

            <Card
              className="rounded-2xl border p-4 shadow-sm"
              data-testid="settlement-suggestions"
            >
              <div className="text-sm font-semibold text-muted-foreground">おすすめ送金</div>
              <div className="mt-1 text-xs text-muted-foreground" data-testid="settlement-suggestion-note">
                送金回数が最小になる組み合わせを提案しています。残高の合計は0円になります。
              </div>
              {!expenseLedgerSuggestions?.items?.length ? (
                <div className="mt-3 text-sm text-muted-foreground">提案がありません。</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {expenseLedgerSuggestions.items.map((s, index) => (
                    <div
                      key={`${s.fromMemberId}-${s.toMemberId}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/90 px-3 py-2 text-sm"
                      data-testid={`settlement-suggestion-${index}`}
                    >
                      <div>
                        <span className="font-semibold">
                          {resolveLedgerMemberLabel(s.fromMemberId)}
                        </span>
                        <span className="px-1 text-muted-foreground">→</span>
                        <span className="font-semibold">
                          {resolveLedgerMemberLabel(s.toMemberId)}
                        </span>
                      </div>
                      <div className="font-semibold">{formatAmountYen(s.amountYen)}</div>
                    </div>
                  ))}
                </div>
              )}
              {expenseLedgerSuggestions?.generatedAt ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  生成: {expenseLedgerSuggestions.generatedAt}
                </div>
              ) : null}
            </Card>
          </>
        )}

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
          <Card className="rounded-2xl border p-4 shadow-sm" data-testid="settlement-create-form">
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
                data-testid="settlement-create-submit"
              >
                精算を登録
              </Button>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border p-4 shadow-sm" data-testid="settlement-results">
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
                  data-testid={`settlement-item-${item.id}`}
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

      <Dialog open={showCreateExpenseDialog} onOpenChange={setShowCreateExpenseDialog}>
        <DialogContent data-testid="settlement-create-dialog">
          <DialogHeader>
            <DialogTitle>立替を追加</DialogTitle>
            <DialogDescription>割り勘の立替を記録します。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">タイトル</div>
              <Input
                placeholder="例: 遠征交通費"
                value={ceTitle}
                onChange={(e) => setCeTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">金額（円）</div>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="例: 12000"
                value={ceAmountYen}
                onChange={(e) => setCeAmountYen(e.target.value)}
                data-testid="settlement-create-total"
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">割り勘方法</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    ceSplitType === "equal"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                      : "border-border/60 text-muted-foreground"
                  )}
                  data-testid="settlement-create-method-equal"
                  onClick={() => setCeSplitType("equal")}
                >
                  均等割
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    ceSplitType === "fixed"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                      : "border-border/60 text-muted-foreground"
                  )}
                  data-testid="settlement-create-method-fixed"
                  onClick={() => setCeSplitType("fixed")}
                >
                  個別指定
                </button>
              </div>
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">支払者</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setCePayerMemberId(m.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      cePayerMemberId === m.id
                        ? "border-blue-500/50 bg-blue-500/15 text-blue-600"
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    {m.nickname ?? m.initial ?? ("#" + m.id)}
                  </button>
                ))}
              </div>
            </div>
            {ceSplitType === "equal" && (
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">参加メンバー</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const selected = ceParticipants.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleCeParticipant(m.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          selected
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                            : "border-border/60 text-muted-foreground"
                        )}
                      >
                        {m.nickname ?? m.initial ?? ("#" + m.id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {ceSplitType === "fixed" && (
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">個別金額</div>
                <div className="grid gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="w-16 text-xs truncate">{m.nickname ?? m.initial ?? ("#" + m.id)}</span>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="0"
                        value={ceShares[m.id] ?? ""}
                        onChange={(e) => setCeShares((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  合計: {ceFixedSum}円 / {ceTotal}円
                </div>
              </div>
            )}
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">日付</div>
              <Input
                type="date"
                value={ceOccurredOn}
                onChange={(e) => setCeOccurredOn(e.target.value)}
              />
            </div>
            {ceCreateError && (
              <div className="text-xs text-rose-500" data-testid="settlement-create-error">
                {ceCreateError}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleCreateExpense}
              disabled={ceCreateDisabled}
              data-testid="settlement-create-submit"
            >
              登録
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVoidReplaceDialog} onOpenChange={setShowVoidReplaceDialog}>
        <DialogContent data-testid="settlement-void-replace-dialog">
          <DialogHeader>
            <DialogTitle>取消して置換</DialogTitle>
            <DialogDescription>立替を取消し、修正内容で新しい立替を作成します。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">タイトル</div>
              <Input
                placeholder="例: 遠征交通費"
                value={vrTitle}
                onChange={(e) => setVrTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">金額（円）</div>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="例: 12000"
                value={vrAmountYen}
                onChange={(e) => setVrAmountYen(e.target.value)}
                data-testid="settlement-void-replace-total"
              />
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">割り勘方法</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    vrSplitType === "equal"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                      : "border-border/60 text-muted-foreground"
                  )}
                  data-testid="settlement-void-replace-method-equal"
                  onClick={() => setVrSplitType("equal")}
                >
                  均等割
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    vrSplitType === "fixed"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                      : "border-border/60 text-muted-foreground"
                  )}
                  data-testid="settlement-void-replace-method-fixed"
                  onClick={() => setVrSplitType("fixed")}
                >
                  個別指定
                </button>
              </div>
            </div>
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">支払者</div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setVrPayerMemberId(m.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      vrPayerMemberId === m.id
                        ? "border-blue-500/50 bg-blue-500/15 text-blue-600"
                        : "border-border/60 text-muted-foreground"
                    )}
                  >
                    {m.nickname ?? m.initial ?? ("#" + m.id)}
                  </button>
                ))}
              </div>
            </div>
            {vrSplitType === "equal" && (
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">参加メンバー</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const selected = vrParticipants.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleVrParticipant(m.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          selected
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                            : "border-border/60 text-muted-foreground"
                        )}
                      >
                        {m.nickname ?? m.initial ?? ("#" + m.id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {vrSplitType === "fixed" && (
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">個別金額</div>
                <div className="grid gap-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="w-16 text-xs truncate">{m.nickname ?? m.initial ?? ("#" + m.id)}</span>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="0"
                        value={vrShares[m.id] ?? ""}
                        onChange={(e) => setVrShares((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  合計: {vrFixedSum}円 / {vrTotal}円
                </div>
              </div>
            )}
            {vrCreateError && (
              <div className="text-xs text-rose-500" data-testid="settlement-void-replace-error">
                {vrCreateError}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleVoidReplace}
              disabled={vrCreateDisabled}
              data-testid="settlement-void-replace-submit"
            >
              取消して置換
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
