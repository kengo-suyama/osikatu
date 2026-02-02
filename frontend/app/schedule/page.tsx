"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { fetchMySchedules, createMySchedule, deleteMySchedule } from "@/lib/repo/scheduleRepo";
import type { ScheduleDto } from "@/lib/types";
import { isApiMode } from "@/lib/config";

const DEFAULT_FORM = {
  title: "",
  startAt: "",
  endAt: "",
  isAllDay: false,
  note: "",
  location: "",
  remindAt: "",
};

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = () => {
    if (!isApiMode()) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    fetchMySchedules()
      .then((items) => setSchedules(items))
      .catch(() => setError("予定を取得できませんでした"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreate = async () => {
    setError(null);
    setSaving(true);
    try {
      const dto = await createMySchedule({
        title: form.title,
        startAt: form.startAt,
        endAt: form.endAt || undefined,
        isAllDay: form.isAllDay,
        note: form.note || undefined,
        location: form.location || undefined,
        remindAt: form.remindAt || undefined,
      });
      setSchedules((prev) => [...prev, dto]);
      setForm(DEFAULT_FORM);
    } catch (err: any) {
      setError(err?.message ?? "保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この予定を削除しますか？")) return;
    try {
      await deleteMySchedule(id);
      setSchedules((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("削除できませんでした");
    }
  };

  const formattedSchedules = useMemo(
    () => schedules.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [schedules]
  );

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">予定</h1>
          <p className="text-sm text-muted-foreground">個人予定を管理</p>
        </div>
        <div className="text-xs text-muted-foreground">{isApiMode() ? "APIモード" : "ローカルモード"}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="タイトル"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <Input
          type="datetime-local"
          value={form.startAt}
          onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
        />
        <Input
          type="datetime-local"
          value={form.endAt}
          onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
        />
        <Input
          placeholder="ロケーション"
          value={form.location}
          onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
        />
        <Input
          type="datetime-local"
          value={form.remindAt}
          onChange={(event) => setForm((prev) => ({ ...prev, remindAt: event.target.value }))}
        />
        <Textarea
          placeholder="メモ"
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
        />
        <Button
          className="sm:col-span-2"
          onClick={handleCreate}
          disabled={saving || !form.title || !form.startAt}
        >
          {saving ? "保存中..." : "予定を追加"}
        </Button>
      </div>
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">読み込み中...</div>
        ) : formattedSchedules.length ? (
          formattedSchedules.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.isAllDay ? "終日" : `${new Date(item.startAt).toLocaleString()} 〜 ${item.endAt ? new Date(item.endAt).toLocaleString() : ""}`}
                </div>
                {item.location ? (
                  <div className="text-xs text-muted-foreground">場所: {item.location}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">予定がありません</div>
        )}
      </div>
    </div>
  );
}
