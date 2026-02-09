"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ScheduleDto } from "@/lib/types";
import { createMySchedule, deleteMySchedule, fetchMySchedules, updateMySchedule } from "@/lib/repo/scheduleRepo";
import { ApiRequestError } from "@/lib/repo/http";

type FormState = {
  title: string;
  startAt: string; // datetime-local
  endAt: string; // datetime-local
  isAllDay: boolean;
  note: string;
  location: string;
  remindAt: string; // datetime-local
};

const DEFAULT_FORM: FormState = {
  title: "",
  startAt: "",
  endAt: "",
  isAllDay: false,
  note: "",
  location: "",
  remindAt: "",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const isoToLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
};

const localInputToIso = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

const formatRange = (item: ScheduleDto) => {
  if (item.isAllDay) return "終日";
  const start = item.startAt ? new Date(item.startAt).toLocaleString() : "";
  const end = item.endAt ? new Date(item.endAt).toLocaleString() : "";
  if (!end) return start;
  return `${start} 〜 ${end}`;
};

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenNew = searchParams.get("new") === "1";

  const [items, setItems] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [datetimeError, setDatetimeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openedFromQueryRef = useRef(false);

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [items]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMySchedules();
      setItems(list);
    } catch {
      setError("予定を取得できませんでした");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!shouldOpenNew) return;
    if (openedFromQueryRef.current) return;
    openedFromQueryRef.current = true;
    setMode("create");
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
    // Clean the query to avoid re-opening on back/forward loops.
    router.replace("/schedule");
  }, [router, shouldOpenNew]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setTitleError(null);
    setDatetimeError(null);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (item: ScheduleDto) => {
    setMode("edit");
    setEditingId(item.id);
    setForm({
      title: item.title ?? "",
      startAt: isoToLocalInput(item.startAt),
      endAt: isoToLocalInput(item.endAt),
      isAllDay: Boolean(item.isAllDay),
      note: item.note ?? "",
      location: item.location ?? "",
      remindAt: isoToLocalInput(item.remindAt),
    });
    setTitleError(null);
    setDatetimeError(null);
    setFormError(null);
    setOpen(true);
  };

  const onSubmit = async () => {
    setTitleError(null);
    setDatetimeError(null);
    setFormError(null);
    if (!form.title.trim()) {
      setTitleError("タイトルを入力してください");
      return;
    }
    if (!form.startAt) {
      setDatetimeError("開始日時を入力してください");
      return;
    }
    if (form.endAt) {
      const startMs = new Date(form.startAt).getTime();
      const endMs = new Date(form.endAt).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs < startMs) {
        setDatetimeError("終了日時は開始日時以降にしてください");
        return;
      }
    }
    if (form.remindAt) {
      const startMs = new Date(form.startAt).getTime();
      const remindMs = new Date(form.remindAt).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(remindMs) && remindMs < startMs) {
        setDatetimeError("リマインド日時は開始日時以降にしてください");
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      startAt: localInputToIso(form.startAt),
      endAt: form.endAt ? localInputToIso(form.endAt) : null,
      isAllDay: form.isAllDay,
      note: form.note.trim() ? form.note.trim() : null,
      location: form.location.trim() ? form.location.trim() : null,
      remindAt: form.remindAt ? localInputToIso(form.remindAt) : null,
    };
    if (!payload.startAt) {
      setDatetimeError("開始日時の形式が不正です");
      return;
    }
    if (form.endAt && !payload.endAt) {
      setDatetimeError("終了日時の形式が不正です");
      return;
    }
    if (form.remindAt && !payload.remindAt) {
      setDatetimeError("リマインド日時の形式が不正です");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createMySchedule(payload);
        setItems((prev) => [...prev, created]);
      } else if (editingId) {
        const updated = await updateMySchedule(editingId, payload);
        setItems((prev) => prev.map((x) => (String(x.id) === String(editingId) ? updated : x)));
      }
      setOpen(false);
    } catch (e: unknown) {
      if (e instanceof ApiRequestError && e.status === 422) {
        setFormError("入力内容を確認してください");
        const details = e.details;
        if (details && typeof details === "object") {
          const mapFirst = (value: unknown) => {
            if (Array.isArray(value) && typeof value[0] === "string") return value[0];
            if (typeof value === "string") return value;
            return null;
          };
          const d = details as Record<string, unknown>;
          const t = mapFirst(d.title);
          const s = mapFirst(d.startAt);
          const en = mapFirst(d.endAt);
          const r = mapFirst(d.remindAt);
          if (t) setTitleError(t);
          const dt = s ?? en ?? r;
          if (dt) setDatetimeError(dt);
        }
        return;
      }
      setFormError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("この予定を削除しますか？");
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      await deleteMySchedule(id);
      setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
    } catch {
      setError("削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6 pb-24" data-testid="schedule-page">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div className="text-lg font-semibold">予定</div>
          </div>
          <div className="text-xs text-muted-foreground">個人の予定をメモして、忘れないように。</div>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="rounded-full"
          data-testid="schedule-create"
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : sortedItems.length ? (
            sortedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/60 bg-background/70 p-3"
                data-testid="schedule-item"
                data-schedule-id={String(item.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{item.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatRange(item)}</div>
                    {item.location ? (
                      <div className="mt-1 text-xs text-muted-foreground">場所: {item.location}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-full border border-border/60 p-2 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(item)}
                      aria-label="編集"
                      data-testid="schedule-edit"
                      data-schedule-id={String(item.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50"
                      onClick={() => onDelete(item.id)}
                      aria-label="削除"
                      data-testid="schedule-delete"
                      data-schedule-id={String(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {item.note ? (
                  <div className="mt-2 rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    {item.note}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              予定がありません。右上の「追加」から作ってみよう。
            </div>
          )}
          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-4" data-testid="schedule-dialog">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">
              {mode === "create" ? "予定を追加" : "予定を編集"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">タイトル</div>
              <Input
                placeholder="例: 配信を見る"
                value={form.title}
                onChange={(e) => {
                  setForm((p) => ({ ...p, title: e.target.value }));
                  if (titleError) setTitleError(null);
                  if (formError) setFormError(null);
                }}
                data-testid="schedule-form-title"
              />
              {titleError ? (
                <div className="text-xs text-red-600" data-testid="schedule-title-error">
                  {titleError}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">開始</div>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => {
                  setForm((p) => ({ ...p, startAt: e.target.value }));
                  if (datetimeError) setDatetimeError(null);
                  if (formError) setFormError(null);
                }}
                data-testid="schedule-form-start"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">終了（任意）</div>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => {
                  setForm((p) => ({ ...p, endAt: e.target.value }));
                  if (datetimeError) setDatetimeError(null);
                  if (formError) setFormError(null);
                }}
                disabled={form.isAllDay}
                data-testid="schedule-form-end"
              />
              {datetimeError ? (
                <div className="text-xs text-red-600" data-testid="schedule-datetime-error">
                  {datetimeError}
                </div>
              ) : null}
            </div>

            <label className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-xs">
              終日
              <Switch
                checked={form.isAllDay}
                onCheckedChange={(checked) => {
                  setForm((p) => ({ ...p, isAllDay: checked, endAt: checked ? "" : p.endAt }));
                  if (datetimeError) setDatetimeError(null);
                  if (formError) setFormError(null);
                }}
                data-testid="schedule-form-allday"
              />
            </label>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">場所（任意）</div>
              <Input
                placeholder="例: YouTube"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                data-testid="schedule-form-location"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">リマインド（任意）</div>
              <Input
                type="datetime-local"
                value={form.remindAt}
                onChange={(e) => {
                  setForm((p) => ({ ...p, remindAt: e.target.value }));
                  if (datetimeError) setDatetimeError(null);
                  if (formError) setFormError(null);
                }}
                data-testid="schedule-form-remind"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-muted-foreground">メモ（任意）</div>
              <Textarea
                placeholder="あとで見返せるメモ"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                data-testid="schedule-form-note"
              />
            </div>

            <div
              className={cn(
                "sticky bottom-0 -mx-4 mt-2 border-t bg-background px-4 pt-3"
              )}
            >
              {formError ? (
                <div className="mb-2 rounded-xl border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600">
                  {formError}
                </div>
              ) : null}
              <div className="flex items-center justify-end gap-2 pb-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSubmit}
                  disabled={saving}
                  data-testid="schedule-create-submit"
                >
                  <span data-testid="schedule-save">
                    {saving ? "保存中..." : mode === "create" ? "追加する" : "更新する"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
