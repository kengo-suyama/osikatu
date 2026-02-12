"use client";

import { useEffect, useMemo, useState } from "react";
import NextDeadlines from "@/components/widgets/NextDeadlines";
import TicketTimeline from "@/components/schedule/TicketTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deadlines, ticketTimeline } from "@/lib/dummy";
import type { UserScheduleDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createMySchedule,
  deleteMySchedule,
  fetchMySchedules,
} from "@/lib/repo/scheduleRepo";

export default function ScheduleScreen() {
  const [items, setItems] = useState<UserScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const hasConflict = false;

  const dateRange = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchMySchedules({ from: dateRange.from, to: dateRange.to, search: searchQuery || undefined })
      .then((data) => {
        if (!mounted) return;
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("予定を取得できませんでした");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dateRange.from, dateRange.to, searchQuery]);

  const formatRange = (item: UserScheduleDto) => {
    const start = item.startAt ? item.startAt.replace("T", " ").slice(0, 16) : "";
    const end = item.endAt ? item.endAt.replace("T", " ").slice(0, 16) : "";
    if (item.isAllDay) return `${start.slice(0, 10)} 終日`;
    if (!end || end === start) return start;
    return `${start} 〜 ${end}`;
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setMessage("タイトルを入力してください");
      return;
    }
    if (!startAt) {
      setMessage("開始日時を入力してください");
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const payload = {
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        isAllDay,
      };
      const created = await createMySchedule(payload);
      setItems((prev) => [created, ...prev]);
      setOpen(false);
      setTitle("");
      setStartAt("");
      setEndAt("");
      setIsAllDay(false);
      setMessage("保存しました");
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("この予定を削除してもよろしいですか？");
      if (!ok) return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      await deleteMySchedule(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage("削除しました");
    } catch {
      setMessage("削除に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {hasConflict ? (
        <Card className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 shadow-sm">
          <div className="text-sm font-semibold text-red-600">予定が重なっています</div>
          <div className="text-xs text-muted-foreground">
            2/02 のコラボ配信が別予定と重なっています。
          </div>
        </Card>
      ) : null}

      <TicketTimeline steps={ticketTimeline} />

      <NextDeadlines items={deadlines} />

      <div className="relative" data-testid="schedule-search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="予定を検索…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">次の予定</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>予定を追加</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <div className="text-xs text-muted-foreground">タイトル</div>
                  <Input
                    placeholder="例: 通院"
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
                {message ? (
                  <div
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs",
                      message.includes("失敗")
                        ? "border-red-500/40 text-red-600"
                        : "border-emerald-500/40 text-emerald-600"
                    )}
                  >
                    {message}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleCreate} disabled={actionLoading}>
                    追加する
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3 p-0" data-testid="schedule-list">
          {loading ? (
            <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
              読み込み中…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
              {error}
            </div>
          ) : items.length ? (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{item.title}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoading}
                  >
                    削除
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">{formatRange(item)}</div>
                {item.location ? (
                  <div className="text-xs text-muted-foreground">{item.location}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              予定がまだありません。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
