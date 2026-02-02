"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import type { CircleDto, MeDto, OperationLogDto } from "@/lib/types";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { deleteCircleLog, listCircleLogs } from "@/lib/repo/operationLogRepo";
import { ApiRequestError } from "@/lib/repo/http";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Trash2 } from "lucide-react";
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

  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("7d");
  const [items, setItems] = useState<OperationLogDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const isManager = Boolean(
    me?.plan === "plus" && (circle?.myRole === "owner" || circle?.myRole === "admin")
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const from = useMemo(() => {
    if (range === "7d") return isoDateDaysAgo(7);
    if (range === "30d") return isoDateDaysAgo(30);
    return null;
  }, [range]);

  const loadFirst = async () => {
    if (!circleId) return;
    if (!isManager) {
      setForbidden(true);
      return;
    }

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

  const showToast = (title: string, description?: string) => {
    setToastTitle(title);
    setToastDescription(description ?? "");
    setToastOpen(true);
  };

  const handleDeleteCircleLog = async (logId: string) => {
    if (!circleId) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm("このログを削除してもよろしいですか？")
    ) {
      return;
    }

    setDeletingLogId(logId);
    try {
      await deleteCircleLog(circleId, logId);
      setItems((prev) => prev.filter((item) => item.id !== logId));
      showToast("サークルログを削除しました");
    } catch (err: any) {
      const message =
        err instanceof ApiRequestError ? err.message : "削除に失敗しました。";
      showToast("削除に失敗しました", message);
    } finally {
      setDeletingLogId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!circleId) return;

    Promise.all([circleRepo.get(Number(circleId)), meRepo.getMe()])
      .then(([circleData, meData]) => {
        if (!mounted) return;
        setCircle(circleData);
        setMe(meData);

        const hasPermission =
          meData.plan === "plus" &&
          (circleData?.myRole === "owner" || circleData?.myRole === "admin");

        if (!hasPermission) {
          setForbidden(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("サークル情報を取得できませんでした");
      });

    return () => {
      mounted = false;
    };
  }, [circleId]);

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
    <ToastProvider>
      <div className="mx-auto max-w-xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">サークル操作ログ</div>
            <div className="text-xs opacity-70">Plusのオーナー/管理者のみ閲覧できます</div>
          </div>

          <Link
            href={`/circles/${circleId}`}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:opacity-90"
          >
            戻る
          </Link>
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
          {error ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : forbidden ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-80">
              Plusのオーナー/管理者のみご利用いただけます。
            </div>
          ) : (
            <>
              {items.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{logSentence(log)}</div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void handleDeleteCircleLog(log.id)}
                      disabled={deletingLogId === log.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
