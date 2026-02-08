"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import {
  createCircleSchedule,
  deleteCircleSchedule,
  listCircleSchedules,
  updateCircleSchedule,
} from "@/lib/repo/circleCalendarRepo";
import type { CircleScheduleDto, MeDto, ScheduleProposalDto } from "@/lib/types";
import {
  createProposal,
  listMyProposals,
  listProposals,
  approveProposal,
  rejectProposal,
} from "@/lib/repo/circleProposalRepo";

export default function CircleCalendarPage({
  params,
}: {
  params: { circleId: string };
}) {
  const circleId = Number(params.circleId);
  const [items, setItems] = useState<CircleScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [circleName, setCircleName] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [myProposals, setMyProposals] = useState<ScheduleProposalDto[]>([]);
  const [pendingProposals, setPendingProposals] = useState<ScheduleProposalDto[]>([]);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [proposalDateFrom, setProposalDateFrom] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const showToast = (titleText: string, description: string) => {
    setToastTitle(titleText);
    setToastDescription(description);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      from: now.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const isPremium = ["premium", "plus"].includes(me?.effectivePlan ?? me?.plan ?? "free");
  const isManager = myRole === "owner" || myRole === "admin";
  const canEdit = isPremium && isManager;
  const pendingApproveCount = canEdit ? pendingProposals.length : 0;

  const calendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startWeekday = start.getDay();
    const daysInMonth = end.getDate();
    const days = Array.from({ length: startWeekday + daysInMonth }, (_, idx) =>
      idx < startWeekday ? null : idx - startWeekday + 1
    );

    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (!item.startAt) return;
      const key = item.startAt.slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    });

    return {
      year,
      month,
      days,
      counts,
      label: `${year}年${month + 1}月`,
    };
  }, [items]);

  useEffect(() => {
    let mounted = true;
    if (!Number.isFinite(circleId)) return;
    setLoading(true);
    setError(null);
    setAccessDenied(false);

    Promise.all([circleRepo.get(circleId), meRepo.getMe()])
      .then(([circle, meData]) => {
        if (!mounted) return;
        if (!circle) {
          setCircleName(null);
          setMyRole(null);
          setMe(meData);
          setAccessDenied(true);
          setError("このサークルは存在しません");
          return;
        }
        setCircleName(circle.name ?? null);
        setMyRole(circle.myRole ?? null);
        setMe(meData);
      })
      .catch(() => {
        if (!mounted) return;
        setCircleName(null);
        setMyRole(null);
        setMe(null);
      });

    listCircleSchedules(circleId, dateRange)
      .then((data) => {
        if (!mounted) return;
        setItems(data.items ?? []);
      })
      .catch((errorValue: any) => {
        if (!mounted) return;
        const status = errorValue?.status ?? errorValue?.statusCode;
        if (status === 404 || status === 403) {
          setAccessDenied(true);
          setError("このサークルの予定にアクセスできません");
          return;
        }
        setError("予定を取得できませんでした");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    // Load proposals (best-effort, no error display)
    listMyProposals(circleId)
      .then((data) => {
        if (!mounted) return;
        setMyProposals(data.items ?? []);
      })
      .catch(() => { /* ignore */ });

    listProposals(circleId, "pending")
      .then((data) => {
        if (!mounted) return;
        setPendingProposals(data.items ?? []);
      })
      .catch(() => { /* ignore — member gets 403, which is fine */ });

    return () => {
      mounted = false;
    };
  }, [circleId, dateRange]);

  const formatDate = (value: string | null) => {
    if (!value) return "";
    return value.replace("T", " ").slice(0, 16);
  };

  const toInputValue = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  };

  const formatRange = (item: CircleScheduleDto) => {
    if (item.isAllDay) {
      return `${formatDate(item.startAt).slice(0, 10)} 終日`;
    }
    if (!item.endAt || item.endAt === item.startAt) {
      return formatDate(item.startAt);
    }
    return `${formatDate(item.startAt)} 〜 ${formatDate(item.endAt)}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setStartAt("");
    setEndAt("");
    setIsAllDay(false);
    setNote("");
    setLocation("");
    setOpen(true);
  };

  const openEdit = (item: CircleScheduleDto) => {
    setEditingId(item.id);
    setTitle(item.title);
    setStartAt(toInputValue(item.startAt));
    setEndAt(toInputValue(item.endAt ?? item.startAt));
    setIsAllDay(Boolean(item.isAllDay));
    setNote(item.note ?? "");
    setLocation(item.location ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("入力不足", "タイトルを入力してください");
      return;
    }
    if (!startAt) {
      showToast("入力不足", "開始日時を入力してください");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        isAllDay,
        note: note.trim() ? note.trim() : null,
        location: location.trim() ? location.trim() : null,
      };

      if (editingId) {
        const updated = await updateCircleSchedule(circleId, editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
        showToast("保存しました", "予定を更新しました");
      } else {
        const created = await createCircleSchedule(circleId, payload);
        setItems((prev) => [created, ...prev]);
        showToast("保存しました", "予定を追加しました");
      }

      setOpen(false);
      setEditingId(null);
    } catch (errorValue: any) {
      const status = errorValue?.status ?? errorValue?.statusCode;
      if (status === 403 && !editingId) {
        // Fallback: create as proposal instead
        try {
          const result = await createProposal(circleId, {
            title: title.trim(),
            startAt: new Date(startAt).toISOString(),
            endAt: endAt ? new Date(endAt).toISOString() : undefined,
            isAllDay,
            note: note.trim() ? note.trim() : null,
            location: location.trim() ? location.trim() : null,
          });
          setMyProposals((prev) => [result.proposal, ...prev]);
          showToast("提案を送信しました", "オーナー/管理者の承認後にカレンダーに反映されます");
          setOpen(false);
        } catch {
          showToast("提案の送信に失敗しました", "時間を置いて再度お試しください");
        }
      } else if (status === 403) {
        showToast("権限がありません", "予定の編集はオーナー/管理者（Plusプラン）が行えます");
      } else if (status === 422) {
        showToast("入力エラー", "入力内容を確認してください");
      } else {
        showToast("保存失敗", "予定の保存に失敗しました");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("この予定を削除してもよろしいですか？");
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      await deleteCircleSchedule(circleId, scheduleId);
      setItems((prev) => prev.filter((item) => item.id !== scheduleId));
      showToast("削除しました", "予定を削除しました");
    } catch {
      showToast("削除失敗", "予定の削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ToastProvider>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">みんなの予定（カレンダー）</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {circleName ? `${circleName} の共有予定` : "サークル共有予定"}
            </div>
          </div>

          {pendingApproveCount > 0 ? (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="h-7 rounded-full bg-amber-100 px-3 text-[11px] font-medium text-amber-900 hover:bg-amber-100/80"
              data-testid="approve-ready-indicator"
            >
              <a href="#pending-proposals">承認待ち {pendingApproveCount}件</a>
            </Button>
          ) : null}
        </div>

        {accessDenied ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            このサークルの予定にアクセスできません。
          </Card>
        ) : loading ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            読み込み中…
          </Card>
        ) : error ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            {error}
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">月カレンダー</div>
                  <div className="text-xs text-muted-foreground">{calendar.label}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
                {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
                  <div key={label} className="text-center">
                    {label}
                  </div>
                ))}
                {calendar.days.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="h-8" />;
                  }
                  const dateKey = `${calendar.year}-${String(calendar.month + 1).padStart(2, "0")}-${String(
                    day
                  ).padStart(2, "0")}`;
                  const count = calendar.counts[dateKey] ?? 0;
                  return (
                    <div
                      key={dateKey}
                      className="flex h-8 flex-col items-center justify-center rounded-lg border border-border/60"
                    >
                      <div className="text-xs">{day}</div>
                      {count > 0 ? (
                        <div className="mt-0.5 text-[10px] text-primary">
                          {count}件
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">予定一覧</div>
                  <div className="text-xs text-muted-foreground">
                    直近30日を表示しています
                  </div>
                </div>
                <Dialog
                  open={open}
                  onOpenChange={(next) => {
                    if (!next) setEditingId(null);
                    setOpen(next);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={openCreate}
                      data-testid="schedule-create"
                    >
                      予定を追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingId ? "予定を編集" : "予定を追加"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      {!canEdit && (
                        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground" data-testid="schedule-create-hint">
                          予定の「提案」として送信されます。オーナー/管理者の承認後にカレンダーに反映されます。
                        </div>
                      )}
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">タイトル</div>
                        <Input
                          placeholder="例: オフ会"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          data-testid="schedule-create-title"
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">開始</div>
                        <Input
                          type="datetime-local"
                          value={startAt}
                          onChange={(event) => setStartAt(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">終了</div>
                        <Input
                          type="datetime-local"
                          value={endAt}
                          onChange={(event) => setEndAt(event.target.value)}
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                        終日
                        <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                      </label>
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">場所（任意）</div>
                        <Input
                          placeholder="例: 渋谷"
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">メモ（任意）</div>
                        <Textarea
                          placeholder="メモを入力"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={handleSave} disabled={actionLoading} data-testid="schedule-create-submit">
                          {editingId ? "保存する" : "追加する"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-3 space-y-2" data-testid="calendar-items-ready" data-count={items.length}>
                {items.length ? (
                  items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatRange(item)}
                          </div>
                          {item.location ? (
                            <div className="text-xs text-muted-foreground">
                              {item.location}
                            </div>
                          ) : null}
                          {item.note ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.note}
                            </div>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(item)}
                              disabled={actionLoading}
                            >
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                              disabled={actionLoading}
                              data-testid="event-delete"
                            >
                              削除
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    予定がまだありません。
                  </div>
                )}
              </div>
            </Card>
            {/* My proposals (visible to all members) */}
            {myProposals.length > 0 && (() => {
              const filteredMyProposals = myProposals.filter((p) => {
                if (proposalStatusFilter !== "all" && p.status !== proposalStatusFilter) return false;
                if (proposalDateFrom && p.startAt && p.startAt.slice(0, 10) < proposalDateFrom) return false;
                return true;
              });
              return (
              <Card className="rounded-2xl border p-4 shadow-sm" data-testid="schedule-proposal-mine">
                <div className="text-sm font-semibold text-muted-foreground">自分の提案</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setProposalStatusFilter(s)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${proposalStatusFilter === s ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/50" : "border-border/60 text-muted-foreground"}`}
                      data-testid={"proposal-filter-" + s}
                    >
                      {s === "all" ? "すべて" : s === "pending" ? "審査中" : s === "approved" ? "承認済" : "却下"}
                    </button>
                  ))}
                  <input
                    type="date"
                    value={proposalDateFrom}
                    onChange={(e) => setProposalDateFrom(e.target.value)}
                    className="h-6 rounded border border-border/60 px-1 text-[10px]"
                    data-testid="proposal-filter-date-from"
                  />
                </div>
                <div className="mt-2 space-y-2">
                  {filteredMyProposals.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/60 p-3" data-testid={`schedule-proposal-item-${p.id}`}>
                      <div data-testid="proposal-item">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.startAt?.replace("T", " ").slice(0, 16)}
                          </div>
                        </div>
                        <div
                          data-testid="proposal-status"
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          p.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : p.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                        }`}>
                          {p.status === "pending" ? "審査中" : p.status === "approved" ? "承認済" : "却下"}
                        </div>
                      </div>
                      {p.status === "rejected" && p.reviewComment && (
                        <div className="mt-1 text-xs text-muted-foreground" data-testid="proposal-rejected-reason">
                          理由: {p.reviewComment}
                        </div>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
            })()}

            {/* Pending proposals (visible to owner/admin with plus) */}
            {canEdit && pendingProposals.length > 0 && (
              <Card
                id="pending-proposals"
                className="rounded-2xl border p-4 shadow-sm"
                data-testid="schedule-proposal-list"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-muted-foreground">メンバーからの提案</div>
                  <div className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                    {pendingProposals.length}件
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {pendingProposals.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/60 p-3" data-testid={`schedule-proposal-item-${p.id}`}>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.startAt?.replace("T", " ").slice(0, 16)}
                      </div>
                      {p.note && (
                        <div className="mt-1 text-xs text-muted-foreground">{p.note}</div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading}
                          data-testid={`schedule-proposal-approve-${p.id}`}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              const result = await approveProposal(circleId, p.id);
                              setPendingProposals((prev) => prev.filter((pp) => pp.id !== p.id));
                              // Refresh calendar items
                              const { items: refreshed } = await import("@/lib/repo/circleCalendarRepo").then(
                                (mod) => mod.listCircleSchedules(circleId, dateRange)
                              );
                              setItems(refreshed ?? []);
                              showToast("承認しました", `「${p.title}」をカレンダーに追加しました`);
                            } catch {
                              showToast("承認に失敗しました", "時間を置いて再度お試しください");
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          承認
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          data-testid={`schedule-proposal-reject-${p.id}`}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              await rejectProposal(circleId, p.id);
                              setPendingProposals((prev) => prev.filter((pp) => pp.id !== p.id));
                              showToast("却下しました", `「${p.title}」を却下しました`);
                            } catch {
                              showToast("却下に失敗しました", "時間を置いて再度お試しください");
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          却下
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

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
