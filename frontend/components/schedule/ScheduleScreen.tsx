"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextDeadlines from "@/components/widgets/NextDeadlines";
import TicketTimeline from "@/components/schedule/TicketTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deadlines, ticketTimeline } from "@/lib/dummy";
import type { ScheduleDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createMySchedule,
  deleteMySchedule,
  fetchMySchedules,
} from "@/lib/repo/scheduleRepo";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d.toISOString().slice(0, 10), dayNum: d.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push({ date: dt.toISOString().slice(0, 10), dayNum: d, isCurrentMonth: true });
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1);
    days.push({ date: d.toISOString().slice(0, 10), dayNum: d.getDate(), isCurrentMonth: false });
  }
  return days;
}

export default function ScheduleScreen() {
  const [items, setItems] = useState<ScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [tags, setTags] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const dateRange = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }, [viewYear, viewMonth]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchMySchedules({ from: dateRange.from, to: dateRange.to, q: debouncedQ || undefined })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError("予定を取得できませんでした"))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to, debouncedQ]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduleDto[]> = {};
    for (const item of items) {
      const dateKey = item.startAt?.slice(0, 10);
      if (!dateKey) continue;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    }
    return map;
  }, [items]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const formatRange = (item: ScheduleDto) => {
    const start = item.startAt ? item.startAt.replace("T", " ").slice(0, 16) : "";
    const end = item.endAt ? item.endAt.replace("T", " ").slice(0, 16) : "";
    if (item.isAllDay) return `${start.slice(0, 10)} 終日`;
    if (!end || end === start) return start;
    return `${start} 〜 ${end}`;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else { setViewMonth((m) => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else { setViewMonth((m) => m + 1); }
  };

  const handleCreate = async () => {
    if (!title.trim()) { setMessage("タイトルを入力してください"); return; }
    if (!startAt) { setMessage("開始日時を入力してください"); return; }
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const created = await createMySchedule({
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        isAllDay,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      });
      setItems((prev) => [created, ...prev]);
      setOpen(false); setTitle(""); setStartAt(""); setEndAt(""); setIsAllDay(false); setTags("");
      setMessage("保存しました");
    } catch { setMessage("保存に失敗しました"); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined") { const ok = window.confirm("この予定を削除してもよろしいですか？"); if (!ok) return; }
    setActionLoading(true); setMessage(null);
    try { await deleteMySchedule(id); setItems((prev) => prev.filter((item) => item.id !== id)); setMessage("削除しました"); }
    catch { setMessage("削除に失敗しました"); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-4">
      <TicketTimeline steps={ticketTimeline} />
      <NextDeadlines items={deadlines} />

      <div className="px-1">
        <Input placeholder="予定を検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} data-testid="schedule-search" />
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="schedule-month-grid">
        <div className="flex items-center justify-between pb-3">
          <Button size="sm" variant="ghost" onClick={prevMonth}>←</Button>
          <div className="text-sm font-semibold" data-testid="schedule-month-label">{viewYear}年{viewMonth + 1}月</div>
          <Button size="sm" variant="ghost" onClick={nextMonth}>→</Button>
        </div>
        <div className="grid grid-cols-7 gap-px text-center text-[10px]">
          {DAY_LABELS.map((d) => (<div key={d} className="py-1 font-semibold text-muted-foreground">{d}</div>))}
          {monthDays.map((day) => {
            const dayItems = itemsByDate[day.date] ?? [];
            return (
              <div key={day.date} className={cn("min-h-[2.5rem] rounded-md p-0.5 text-[10px]", !day.isCurrentMonth && "text-muted-foreground/40", day.date === todayStr && "bg-primary/10 font-bold")} data-testid="schedule-day-cell" data-date={day.date}>
                <div>{day.dayNum}</div>
                {dayItems.slice(0, 2).map((item) => (<div key={item.id} className="mt-0.5 truncate rounded-sm bg-primary/15 px-0.5 text-[8px] leading-tight" title={item.title}>{item.title}</div>))}
                {dayItems.length > 2 ? <div className="text-[8px] text-muted-foreground">+{dayItems.length - 2}</div> : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">次の予定</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="secondary">追加</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>予定を追加</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2"><div className="text-xs text-muted-foreground">タイトル</div><Input placeholder="例: 通院" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="grid gap-2"><div className="text-xs text-muted-foreground">開始</div><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
                <div className="grid gap-2"><div className="text-xs text-muted-foreground">終了</div><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
                <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">終日<Switch checked={isAllDay} onCheckedChange={setIsAllDay} /></label>
                <div className="grid gap-2"><div className="text-xs text-muted-foreground">タグ（カンマ区切り）</div><Input placeholder="例: ライブ, 遠征" value={tags} onChange={(e) => setTags(e.target.value)} data-testid="schedule-tags-input" /></div>
                {message ? <div className={cn("rounded-md border px-3 py-2 text-xs", message.includes("失敗") ? "border-red-500/40 text-red-600" : "border-emerald-500/40 text-emerald-600")}>{message}</div> : null}
                <div className="flex justify-end"><Button size="sm" onClick={handleCreate} disabled={actionLoading}>追加する</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {loading ? <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">読み込み中…</div>
          : error ? <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">{error}</div>
          : items.length ? items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{item.title}</div>
                <Button size="sm" variant="outline" onClick={() => handleDelete(item.id)} disabled={actionLoading}>削除</Button>
              </div>
              <div className="text-xs text-muted-foreground">{formatRange(item)}</div>
              {item.location ? <div className="text-xs text-muted-foreground">{item.location}</div> : null}
              {item.tags && item.tags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1" data-testid="schedule-item-tags">
                  {item.tags.map((tag) => <span key={tag} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>)}
                </div>
              ) : null}
            </div>
          )) : <div className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">予定がまだありません。</div>}
        </CardContent>
      </Card>
    </div>
  );
}
