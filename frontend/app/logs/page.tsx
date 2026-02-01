"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { OperationLogDto } from "@/lib/types";
import { listMyLogs } from "@/lib/repo/operationLogRepo";
import { formatLogTime, logSentence } from "@/lib/ui/logText";

type RangeKey = "7d" | "30d" | "all";

function isoDateDaysAgo(days: number) {
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

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const from = useMemo(() => {
    if (range === "7d") return isoDateDaysAgo(7);
    if (range === "30d") return isoDateDaysAgo(30);
    return null;
  }, [range]);

  const loadFirst = async () => {
    setLoading(true);
    setDone(false);
    try {
      const data = await listMyLogs({ limit: 20, from, cursor: null });
      setItems(data.items);
      setCursor(data.nextCursor);
      setDone(!data.nextCursor);
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

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "200px" }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, done, loading, from]);

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-lg font-semibold">操作ログ</div>
          <div className="text-xs opacity-70">自分の操作履歴</div>
        </div>

        <div className="flex gap-2 text-sm">
          <button
            className={`rounded-xl border px-3 py-1 ${
              range === "7d" ? "opacity-100" : "opacity-60"
            }`}
            onClick={() => setRange("7d")}
          >
            7日
          </button>
          <button
            className={`rounded-xl border px-3 py-1 ${
              range === "30d" ? "opacity-100" : "opacity-60"
            }`}
            onClick={() => setRange("30d")}
          >
            30日
          </button>
          <button
            className={`rounded-xl border px-3 py-1 ${
              range === "all" ? "opacity-100" : "opacity-60"
            }`}
            onClick={() => setRange("all")}
          >
            すべて
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((log) => (
          <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm">{logSentence(log)}</div>
            <div className="mt-1 text-xs opacity-60">{formatLogTime(log.createdAt)}</div>
          </div>
        ))}

        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-70">
            ログがまだありません
          </div>
        ) : null}

        <div ref={sentinelRef} />

        {loading ? (
          <div className="py-4 text-center text-sm opacity-70">読み込み中...</div>
        ) : null}
        {done && items.length > 0 ? (
          <div className="py-4 text-center text-xs opacity-60">ここまで</div>
        ) : null}
      </div>
    </div>
  );
}
