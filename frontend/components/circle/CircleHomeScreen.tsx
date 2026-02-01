"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle, Receipt, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { postRepo } from "@/lib/repo/postRepo";
import { listCircleLogs } from "@/lib/repo/operationLogRepo";
import type { CircleDto, MeDto, OperationLogDto, PostDto } from "@/lib/types";
import { formatLogTime, logSentence } from "@/lib/ui/logText";
import { cn } from "@/lib/utils";

type ActivityLabel = {
  text: string;
  className: string;
};

const resolveActivityLabel = (lastActivityAt?: string | null): ActivityLabel | null => {
  if (!lastActivityAt) return null;
  const time = new Date(lastActivityAt).getTime();
  if (Number.isNaN(time)) return null;
  const diffHours = (Date.now() - time) / (1000 * 60 * 60);
  if (diffHours <= 24) {
    return { text: "最近活動あり", className: "bg-emerald-500/15 text-emerald-600" };
  }
  if (diffHours <= 24 * 3) {
    return { text: "3日以内", className: "bg-sky-500/15 text-sky-600" };
  }
  if (diffHours <= 24 * 7) {
    return { text: "1週間以内", className: "bg-sky-500/10 text-sky-500" };
  }
  return { text: "1週間以上前", className: "bg-muted text-muted-foreground" };
};

const resolveChatBody = (post: PostDto) => {
  const body = (post.body ?? "").trim();
  if (body.length > 0) return body;
  if (post.media?.length) return "画像が送信されました";
  return "メッセージ";
};

export default function CircleHomeScreen({ circleId }: { circleId: number }) {
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [me, setMe] = useState<MeDto | null>(null);
  const [chatPreview, setChatPreview] = useState<PostDto[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<PostDto[]>([]);
  const [logPreview, setLogPreview] = useState<OperationLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activityLabel = useMemo(
    () => resolveActivityLabel(circle?.lastActivityAt ?? null),
    [circle?.lastActivityAt]
  );

  const isOwner = Boolean(me?.plan === "plus" && circle?.myRole === "owner");
  const pinLimit = isOwner ? 10 : 3;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([circleRepo.get(circleId), meRepo.getMe()])
      .then(([circleData, meData]) => {
        if (!mounted) return;
        setCircle(circleData);
        setMe(meData);
      })
      .catch(() => {
        if (!mounted) return;
        setError("サークル情報を取得できませんでした");
        setCircle(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [circleId]);

  useEffect(() => {
    let mounted = true;
    postRepo
      .listChat(circleId)
      .then((items) => {
        if (!mounted) return;
        const preview = items.slice(-3);
        setChatPreview(preview);
      })
      .catch(() => {
        if (!mounted) return;
        setChatPreview([]);
      });

    return () => {
      mounted = false;
    };
  }, [circleId]);

  useEffect(() => {
    let mounted = true;
    postRepo
      .list(circleId)
      .then((items) => {
        if (!mounted) return;
        const pinned = items.filter((item) => item.isPinned).slice(0, pinLimit);
        setPinnedPosts(pinned);
      })
      .catch(() => {
        if (!mounted) return;
        setPinnedPosts([]);
      });

    return () => {
      mounted = false;
    };
  }, [circleId, pinLimit]);

  useEffect(() => {
    let mounted = true;
    if (!isOwner) {
      setLogPreview([]);
      return;
    }

    listCircleLogs(String(circleId), { limit: 5 })
      .then((data) => {
        if (!mounted) return;
        setLogPreview(data.items);
      })
      .catch(() => {
        if (!mounted) return;
        setLogPreview([]);
      });

    return () => {
      mounted = false;
    };
  }, [circleId, isOwner]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">サークル情報を読み込み中…</div>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="space-y-3">
        <Card className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
          {error ?? "このサークルは表示できません"}
        </Card>
        <Link href="/home" className="text-sm underline">
          Homeへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">サークルHome</div>
          <div className="text-lg font-semibold">{circle.name}</div>
          <div className="text-xs text-muted-foreground">
            推し対象: {circle.oshiLabel ?? "未設定"} · メンバー {circle.memberCount}
          </div>
          {activityLabel ? (
            <span
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                activityLabel.className
              )}
            >
              {activityLabel.text}
            </span>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <Link href={`/circles/${circleId}/chat`}>
            <MessageCircle className="mr-2 h-4 w-4" />
            チャットへ
          </Link>
        </Button>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="text-sm font-semibold text-muted-foreground">最近の活動</div>
        <div className="mt-2 text-sm">
          {circle.lastActivityAt ? (
            <>
              最終更新: {circle.lastActivityAt.replace("T", " ").slice(0, 16)}
            </>
          ) : (
            "まだ活動がありません"
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">作戦会議（チャット）</div>
            <div className="text-xs text-muted-foreground">最近の3件を表示</div>
          </div>
          <Link href={`/circles/${circleId}/chat`} className="text-xs underline">
            チャットへ
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {chatPreview.length ? (
            chatPreview.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 p-3">
                <div className="text-xs text-muted-foreground">
                  {item.author?.name ?? item.user?.name ?? "member"}
                </div>
                <div className="text-sm">{resolveChatBody(item)}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">まだチャットがありません</div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">遠征情報（ピン）</div>
            <div className="text-xs text-muted-foreground">
              集合/会場/持ち物などの固定メモ
            </div>
          </div>
          <Link href={`/circles/${circleId}/pins`} className="text-xs underline">
            一覧へ
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {pinnedPosts.length ? (
            pinnedPosts.map((post) => (
              <div key={post.id} className="rounded-xl border border-border/60 p-3 text-sm">
                {post.body}
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              固定情報がまだありません
            </div>
          )}
        </div>
        {isOwner ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Plusオーナーは最大10件まで固定できます
          </div>
        ) : null}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">みんなの予定</div>
              <div className="text-xs text-muted-foreground">共有カレンダー</div>
            </div>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Freeは閲覧のみ、Premium以上で編集できます
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/calendar`}>カレンダーへ</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">メンバー</div>
              <div className="text-xs text-muted-foreground">
                現在 {circle.memberCount} 人
              </div>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/members`}>一覧へ</Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">割り勘（精算）</div>
            <div className="text-xs text-muted-foreground">
              立替と精算をまとめて管理
            </div>
          </div>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Plusオーナーは作成/編集、メンバーは閲覧できます
        </div>
        <div className="mt-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/circles/${circleId}/settlements`}>精算へ</Link>
          </Button>
        </div>
      </Card>

      {isOwner ? (
        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">サークル操作ログ</div>
              <div className="text-xs text-muted-foreground">最新5件</div>
            </div>
            <Link href={`/circles/${circleId}/logs`} className="text-xs underline">
              もっと見る
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {logPreview.length ? (
              logPreview.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3"
                >
                  <div className="text-sm">{logSentence(log)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatLogTime(log.createdAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">ログがまだありません</div>
            )}
          </div>
        </Card>
      ) : null}

      {isOwner ? (
        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">運営（設定）</div>
              <div className="text-xs text-muted-foreground">
                テーマ・フェス背景・招待管理
              </div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/settings`}>設定へ</Link>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
