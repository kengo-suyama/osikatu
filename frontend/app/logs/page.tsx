"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import type { OperationLogDto } from "@/lib/types";
import { deleteMeLog, listMyLogs } from "@/lib/repo/operationLogRepo";
import { ApiRequestError } from "@/lib/repo/http";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { formatLogTime, logSentence } from "@/lib/ui/logText";

type RangeKey = "7d" | "30d" | "all";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function LogsPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [items, setItems] = useState<OperationLogDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const from = useMemo(() => {
    if (range === "7d") return isoDateDaysAgo(7);
    if (range === "30d") return isoDateDaysAgo(30);
    return null;
  }, [range]);

  const loadFirst = async () => {
    setLoading(true);
    setDone(false);
    setForbidden(false);
    try {
      const data = await listMyLogs({ limit: 20, from, cursor: null });
      setItems(data.items);
      setCursor(data.nextCursor);
      setDone(!data.nextCursor);
    } catch (err: any) {
      if (err?.status === 403) {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const data = await listMyLogs({ limit: 20, from, cursor });
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setDone(!data.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (title: string, description?: string) => {
    setToastTitle(title);
    setToastDescription(description ?? "");
    setToastOpen(true);
  };

  const handleDeleteLog = async (logId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("このログを削除してもよろしいですか？")
    ) {
      return;
    }
    setDeletingLogId(logId);
    try {
      await deleteMeLog(logId);
      setItems((prev) => prev.filter((item) => item.id !== logId));
      showToast("ログを削除しました");
    } catch (err: any) {
      const message =
        err instanceof ApiRequestError ? err.message : "削除に失敗しました。";
      showToast("削除に失敗しました", message);
    } finally {
      setDeletingLogId(null);
    }
  };

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "200px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [cursor, done, loading, from]);

  return (
    <ToastProvider>
      <div className="mx-auto max-w-xl px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold">操作ログ</div>
            <div className="text-xs opacity-70">自分の操作履歴（最新のみ）</div>
          </div>
          <div className="flex gap-2 text-sm">
            {(["7d", "30d", "all"] as RangeKey[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={`rounded-xl border px-3 py-1 ${
                  range === value ? "opacity-100" : "opacity-60"
                }`}
              >
                {value === "7d" ? "7日" : value === "30d" ? "30日" : "すべて"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {forbidden && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-70">
              ログを閲覧する権限がありません
            </div>
          )}

          {!forbidden &&
            items.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{logSentence(log)}</div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDeleteLog(log.id)}
                    disabled={deletingLogId === log.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 text-xs opacity-70">
                  actor: {log.actorUserId}
                  {log.targetType ? ` · ${log.targetType}` : ""}
                </div>
                <div className="mt-1 text-xs opacity-60">{formatLogTime(log.createdAt)}</div>
              </div>
            ))}

          {!forbidden && items.length === 0 && !loading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-70">
              ログがまだありません
            </div>
          )}

          <div ref={sentinelRef} />

          {loading && (
            <div className="py-4 text-center text-sm opacity-70">読み込み中…</div>
          )}
          {done && items.length > 0 && (
            <div className="py-4 text-center text-xs opacity-60">ここまで</div>
          )}
        </div>
      </div>

      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="rounded-xl border border-white/20 bg-white/90 text-sm text-foreground"
      >
        <ToastTitle>{toastTitle}</ToastTitle>
        {toastDescription ? (
          <ToastDescription>{toastDescription}</ToastDescription>
        ) : null}
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
