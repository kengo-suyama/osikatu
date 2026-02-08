"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import type { NotificationDto } from "@/lib/types";
import { fetchNotifications, markNotificationRead } from "@/lib/repo/notificationRepo";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");

  const showToast = (title: string, description: string) => {
    setToastTitle(title);
    setToastDescription(description);
    setToastOpen(false);
    requestAnimationFrame(() => setToastOpen(true));
  };

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    const data = await fetchNotifications({ limit: 20 });
    if (!data) {
      setError("通知を取得できませんでした");
      setItems([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }
    setItems(data.items ?? []);
    setNextCursor(data.nextCursor ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setActionLoading(true);
    const data = await fetchNotifications({ cursor: nextCursor, limit: 20 });
    if (!data) {
      showToast("取得失敗", "通知の読み込みに失敗しました");
      setActionLoading(false);
      return;
    }
    setItems((prev) => [...prev, ...(data.items ?? [])]);
    setNextCursor(data.nextCursor ?? null);
    setActionLoading(false);
  };

  const handleClick = async (item: NotificationDto) => {
    if (!item.readAt) {
      const updated = await markNotificationRead(item.id);
      if (!updated) {
        showToast("既読失敗", "既読処理に失敗しました");
      } else {
        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? updated : row))
        );
      }
    }

    const target = item.openPath ?? item.linkUrl;
    if (target) {
      router.push(target);
    } else {
      showToast("移動先なし", "移動先情報が見つかりませんでした");
    }
  };

  const formatTime = (value: string | null) => {
    if (!value) return "";
    return value.replace("T", " ").slice(0, 16);
  };

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items]
  );

  const formatSourceType = (sourceType: string | null): string | null => {
    if (!sourceType) return null;
    const map: Record<string, string> = {
      scheduleProposal: "予定提案",
      userSchedule: "個人予定",
      circleSchedule: "サークル予定",
    };
    return map[sourceType] ?? sourceType;
  };

  const dateLabel = (isoStr: string | null): string => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today.getTime() - target.getTime()) / 86400000;
    if (diff === 0) return "今日";
    if (diff === 1) return "昨日";
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const grouped = useMemo(() => {
    const groups: { label: string; items: NotificationDto[] }[] = [];
    let currentLabel = "";
    for (const item of items) {
      const label = dateLabel(item.notifyAt || item.createdAt);
      if (label !== currentLabel) {
        groups.push({ label, items: [item] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [items]);

  return (
    <ToastProvider>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">通知</div>
            <div className="text-xs text-muted-foreground">最新の通知</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="h-4 w-4" />
            未読 {unreadCount}
          </div>
        </div>

        {loading ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            読み込み中…
          </Card>
        ) : error ? (
          <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
            {error}
          </Card>
        ) : items.length ? (
          <div className="space-y-4" data-testid="notification-list">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground/80" data-testid="notification-date-group">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleClick(item)}
                      data-testid="notification-item"
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition",
                        item.readAt
                          ? "border-border/60 bg-background"
                          : "border-emerald-500/40 bg-emerald-500/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold" data-testid="notification-title">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.body}</div>
                          {item.sourceType && (
                            <div className="mt-1 text-[10px] text-muted-foreground/70" data-testid="notification-type">{formatSourceType(item.sourceType)}</div>
                          )}
                        </div>
                        {!item.readAt ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-700">
                            未読
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTime(item.notifyAt || item.createdAt)}</span>
                        {item.linkUrl && (
                          <span className="text-[10px] underline opacity-60" data-testid="notification-open">開く</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {nextCursor ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadMore}
                disabled={actionLoading}
                data-testid="notification-load-more"
              >
                もっと見る
              </Button>
            ) : null}
          </div>
        ) : (
          <Card className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            通知はまだありません。
          </Card>
        )}
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
