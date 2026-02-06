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
import type { CircleScheduleDto, MeDto } from "@/lib/types";

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
      if (status === 403) {
        showToast("権限がありません", "編集権限が不足しています");
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
        <div>
          <div className="text-lg font-semibold">みんなの予定（カレンダー）</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {circleName ? `${circleName} の共有予定` : "サークル共有予定"}
          </div>
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
                {canEdit ? (
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
                        data-testid="event-create"
                      >
                        予定を追加
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingId ? "予定を編集" : "予定を追加"}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <div className="text-xs text-muted-foreground">タイトル</div>
                          <Input
                            placeholder="例: オフ会"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
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
                          <Button size="sm" onClick={handleSave} disabled={actionLoading}>
                            {editingId ? "保存する" : "追加する"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Premiumのオーナー/管理者のみ編集できます
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
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
