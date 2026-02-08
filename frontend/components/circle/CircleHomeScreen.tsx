"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Images, MessageCircle, Receipt, Settings, Trash2, Users } from "lucide-react";

import OwnerDashboardCard from "@/components/circle/OwnerDashboardCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { circleOwnerRepo } from "@/lib/repo/circleOwnerRepo";
import { circleRepo } from "@/lib/repo/circleRepo";
import { meRepo } from "@/lib/repo/meRepo";
import { postRepo } from "@/lib/repo/postRepo";
import { inviteRepo } from "@/lib/repo/inviteRepo";
import { chatRepo } from "@/lib/repo/chatRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { listCircleLogs } from "@/lib/repo/operationLogRepo";
import type {
  CircleAnnouncementDto,
  CircleDto,
  MeDto,
  OperationLogDto,
  OwnerDashboardDto,
  PostDto,
} from "@/lib/types";
import { formatLogTime, logSentence } from "@/lib/ui/logText";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardDto | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [chatPreview, setChatPreview] = useState<PostDto[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<PostDto[]>([]);
  const [logPreview, setLogPreview] = useState<OperationLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<CircleAnnouncementDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activityLabel = useMemo(
    () => resolveActivityLabel(circle?.lastActivityAt ?? null),
    [circle?.lastActivityAt]
  );

  const isManager = Boolean(
    me?.plan === "plus" && (circle?.myRole === "owner" || circle?.myRole === "admin")
  );
  const pinLimit = isManager ? 10 : 3;

  const refreshOwnerDashboard = () => {
    setOwnerLoading(true);
    circleOwnerRepo
      .getOwnerDashboard(circleId)
      .then((data) => setOwnerDashboard(data))
      .catch(() => setOwnerDashboard(null))
      .finally(() => setOwnerLoading(false));
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setForbidden(false);
    Promise.all([circleRepo.get(circleId), meRepo.getMe()])
      .then(([circleData, meData]) => {
        if (!mounted) return;
        if (!circleData) {
          setCircle(null);
          setMe(meData);
          setError("サークルが見つかりません");
          return;
        }
        setCircle(circleData);
        setMe(meData);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err instanceof ApiRequestError && err.status === 403) {
          setForbidden(true);
          setError(null);
          return;
        }
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
    chatRepo
      .getAnnouncement(circleId)
      .then((data) => {
        if (!mounted) return;
        setAnnouncement(data);
      })
      .catch(() => {
        if (!mounted) return;
        setAnnouncement(null);
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
        const pinned = items.filter((item) => item.isPinned);
        const sorted = [...pinned].sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return bTime - aTime;

          const aId = typeof a.id === "number" ? a.id : Number.parseInt(String(a.id), 10);
          const bId = typeof b.id === "number" ? b.id : Number.parseInt(String(b.id), 10);
          if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) return bId - aId;

          return String(b.id).localeCompare(String(a.id));
        });

        setPinnedPosts(sorted.slice(0, pinLimit));
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
    if (!isManager) {
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
  }, [circleId, isManager]);

  useEffect(() => {
    let mounted = true;
    if (!isManager) {
      setOwnerDashboard(null);
      return;
    }

    setOwnerLoading(true);
    circleOwnerRepo
      .getOwnerDashboard(circleId)
      .then((data) => {
        if (!mounted) return;
        setOwnerDashboard(data);
      })
      .catch(() => {
        if (!mounted) return;
        setOwnerDashboard(null);
      })
      .finally(() => {
        if (!mounted) return;
        setOwnerLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [circleId, isManager]);

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
        {forbidden ? (
          <Card className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
            <div className="text-sm font-semibold">このサークルは招待制です</div>
            <div className="mt-2 text-xs text-muted-foreground">
              招待コードを入力すると参加できます。
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="招待コード"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
              />
              <Button
                onClick={async () => {
                  if (!inviteCode.trim() || joining) return;
                  setJoining(true);
                  setJoinError(null);
                  try {
                    await inviteRepo.joinByCode(inviteCode.trim());
                    window.location.reload();
                  } catch (err) {
                    setJoinError(
                      err instanceof Error ? err.message : "招待コードが無効です"
                    );
                  } finally {
                    setJoining(false);
                  }
                }}
                disabled={!inviteCode.trim() || joining}
              >
                {joining ? "参加中..." : "参加"}
              </Button>
            </div>
            {joinError ? <div className="mt-2 text-xs text-red-500">{joinError}</div> : null}
          </Card>
        ) : (
          <Card className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
            {error ?? "このサークルは表示できません"}
          </Card>
        )}
        <Link href="/home" className="text-sm underline">
          Homeへ戻る
        </Link>
      </div>
    );
  }

  const circleTitle = circle.name?.trim() ? circle.name : `Circle #${circleId}`;

  return (
    <div className="space-y-4" data-testid="circle-home">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">サークルHome</div>
          <div className="text-lg font-semibold">{circleTitle}</div>
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
          <Link href={`/circles/${circleId}/chat`} data-testid="circle-hub-chat">
            <MessageCircle className="mr-2 h-4 w-4" />
            チャットへ
          </Link>
        </Button>
      </div>

      {announcement?.text ? (
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-50/50 p-4 shadow-sm dark:bg-amber-950/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                📢 お知らせ
              </div>
              <div className="mt-1 text-sm" data-testid="announcement-text">
                {announcement.text}
              </div>
              {announcement.updatedAt ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {announcement.updatedAt.replace("T", " ").slice(0, 16)}
                </div>
              ) : null}
            </div>
            {isManager ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (deleting) return;
                  if (!window.confirm("周知メッセージを削除しますか？")) return;
                  setDeleting(true);
                  try {
                    await chatRepo.deleteAnnouncement(circleId);
                    setAnnouncement({ circleId, text: null, updatedAt: null, updatedBy: null });
                  } catch {
                    // ignore
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                data-testid="announcement-delete"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

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

      {isManager ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">運営サマリ（Plus）</div>
          <OwnerDashboardCard
            dashboard={ownerDashboard}
            loading={ownerLoading}
            onRefresh={refreshOwnerDashboard}
          />
        </div>
      ) : null}

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">作戦会議（チャット）</div>
            <div className="text-xs text-muted-foreground">最近の3件</div>
          </div>
          <Link href={`/circles/${circleId}/chat`} className="text-xs underline" data-testid="circle-hub-chat-preview">
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
            <div className="text-xs text-muted-foreground">集合・会場・持ち物</div>
          </div>
          <Link href={`/circles/${circleId}/pins`} className="text-xs underline" data-testid="circle-hub-pins">
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
        {isManager ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Plusのオーナー/管理者は最大10件まで固定できます
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
              <Link href={`/circles/${circleId}/calendar`} data-testid="circle-hub-calendar">カレンダーへ</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">メンバー</div>
              <div className="text-xs text-muted-foreground">参加メンバー</div>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/members`} data-testid="circle-hub-members">一覧へ</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">アルバム</div>
              <div className="text-xs text-muted-foreground">画像・動画の思い出</div>
            </div>
            <Images className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/album`} data-testid="circle-hub-album">アルバムへ</Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">割り勘（精算）</div>
            <div className="text-xs text-muted-foreground">立替・精算</div>
          </div>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {isManager
            ? "Plusのオーナー/管理者のみ利用できます"
            : "Plusのオーナー/管理者のみ利用できます"}
        </div>
        <div className="mt-3">
          <Button asChild variant="secondary" size="sm" disabled={!isManager}>
            <Link href={`/circles/${circleId}/settlements`} data-testid="circle-hub-settlements">精算へ</Link>
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-muted-foreground">サークル操作ログ</div>
            <div className="text-xs text-muted-foreground">最新5件</div>
          </div>
          <Link href={`/circles/${circleId}/logs`} className="text-xs underline" data-testid="circle-hub-logs">
            もっと見る
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {isManager ? (
            logPreview.length ? (
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
            )
          ) : (
            <div className="text-xs text-muted-foreground">
              Plusのオーナー/管理者のみご利用いただけます。
            </div>
          )}
        </div>
      </Card>

      {isManager ? (
        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">運営（設定）</div>
              <div className="text-xs text-muted-foreground">テーマ・招待</div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/circles/${circleId}/settings`} data-testid="circle-hub-settings">設定へ</Link>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
