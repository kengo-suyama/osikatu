"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { OperationLogDto } from "@/lib/types";
import { listCircleLogs } from "@/lib/repo/operationLogRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { formatLogTime, logSentence } from "@/lib/ui/logText";

type RangeKey = "7d" | "30d" | "all";

function isoDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function CircleLogsPage() {
  const params = useParams<{ circleId: string }>();
  const circleId = params?.circleId;
  const router = useRouter();

  const [range, setRange] = useState<RangeKey>("7d");
  const [items, setItems] = useState<OperationLogDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const from = useMemo(() => {
    if (range === "7d") return isoDateDaysAgo(7);
    if (range === "30d") return isoDateDaysAgo(30);
    return null;
  }, [range]);

  const loadFirst = async () => {
    if (!circleId) return;
    setLoading(true);
    setDone(false);
    setForbidden(false);
    try {
      const data = await listCircleLogs(circleId, { limit: 20, from, cursor: null });
      setItems(data.items);
      setCursor(data.nextCursor);
      setDone(!data.nextCursor);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setForbidden(true);
        setItems([]);
        setCursor(null);
        setDone(true);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!circleId || loading || done || !cursor) return;
    setLoading(true);
    try {
      const data = await listCircleLogs(circleId, { limit: 20, from, cursor });
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
  }, [circleId, range]);

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
  }, [cursor, done, loading, from, circleId]);

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">サークル操作ログ</div>
          <div className="text-xs opacity-70">オーナーのみ閲覧できます</div>
        </div>

        <button
          type="button"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:opacity-90"
          onClick={() => router.back()}
        >
          戻る
        </button>
      </div>

      <div className="mt-3 flex gap-2 text-sm">
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

      <div className="mt-4 space-y-2">
        {forbidden ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-80">
            このサークルのログを閲覧する権限がありません
          </div>
        ) : (
          <>
            {items.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="text-sm">{logSentence(log)}</div>
                <div className="mt-1 text-xs opacity-60">
                  {formatLogTime(log.createdAt)}
                </div>
              </div>
            ))}

            {items.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-70">
                ログがまだありません
              </div>
            ) : null}
          </>
        )}

        <div ref={sentinelRef} />

        {loading ? (
          <div className="py-4 text-center text-sm opacity-70">読み込み中...</div>
        ) : null}
        {done && !forbidden && items.length > 0 ? (
          <div className="py-4 text-center text-xs opacity-60">ここまで</div>
        ) : null}
      </div>
    </div>
  );
}
