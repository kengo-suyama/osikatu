"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import AvatarCircle from "@/components/common/AvatarCircle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import type {
  JoinRequestDto,
  MemberBriefDto,
  OperationLogDto,
  OwnerDashboardDto,
  UnpaidMemberDto,
} from "@/lib/types";
import { joinRequestRepo } from "@/lib/repo/joinRequestRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { listCircleLogs } from "@/lib/repo/operationLogRepo";
import { formatLogTime, logSentence } from "@/lib/ui/logText";
import { cn } from "@/lib/utils";

type OwnerDashboardCardProps = {
  dashboard: OwnerDashboardDto | null;
  loading?: boolean;
  onRemindAll?: () => void;
  onRefresh?: () => void;
};

const listEmptyLabel = "未対応者なし";
const logEmptyLabel = "ログがまだありません";

const renderMemberRow = (member: MemberBriefDto, extra?: string) => (
  <div key={member.id} className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <AvatarCircle
        src={member.avatarUrl}
        nickname={member.nickname ?? member.initial ?? null}
        size={28}
      />
      <div className="text-sm font-medium">
        {member.nickname ?? member.initial ?? "?"}
      </div>
    </div>
    {extra ? <div className="text-xs text-muted-foreground">{extra}</div> : null}
  </div>
);

const renderAvatarRow = (members: MemberBriefDto[]) => {
  const visible = members.slice(0, 5);
  const remaining = Math.max(0, members.length - visible.length);

  return (
    <div className="flex items-center gap-2">
      {visible.map((member) => (
        <AvatarCircle
          key={member.id}
          src={member.avatarUrl}
          nickname={member.nickname ?? member.initial ?? null}
          size={30}
        />
      ))}
      {remaining > 0 ? (
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          ＋残り{remaining}
        </span>
      ) : null}
    </div>
  );
};

export default function OwnerDashboardCard({
  dashboard,
  loading = false,
  onRemindAll,
  onRefresh,
}: OwnerDashboardCardProps) {
  const pathname = usePathname();
  const [tab, setTab] = useState("unconfirmed");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [logItems, setLogItems] = useState<OperationLogDto[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const isAllowed = useMemo(() => {
    if (!dashboard) return false;
    const role = dashboard.myRole;
    return role === "owner" || role === "admin";
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard || !isAllowed) return;
    eventsRepo.track(ANALYTICS_EVENTS.OWNER_DASHBOARD_OPEN, pathname, dashboard.circleId);
  }, [dashboard, isAllowed, pathname]);

  useEffect(() => {
    let mounted = true;
    if (!dashboard?.circleId || !isAllowed) {
      setLogItems([]);
      return undefined;
    }

    setLogLoading(true);
    listCircleLogs(dashboard.circleId, { limit: 5 })
      .then((data) => {
        if (!mounted) return;
        setLogItems(data.items);
      })
      .catch(() => {
        if (!mounted) return;
        setLogItems([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLogLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dashboard?.circleId, isAllowed]);

  if (!dashboard || !isAllowed) return null;

  const nextDeadline = dashboard.nextDeadline;
  const deadlineAt = nextDeadline?.at ?? null;
  const remaining =
    typeof nextDeadline?.remainingMinutes === "number"
      ? `${nextDeadline.remainingMinutes}分`
      : null;

  const unconfirmed = dashboard.unconfirmedMembers;
  const unpaid = dashboard.unpaidMembers.slice(0, 5);
  const unpaidRemaining = Math.max(0, dashboard.unpaidMembers.length - unpaid.length);
  const rsvp = dashboard.rsvpPendingMembers;
  const joinRequests = dashboard.joinRequests ?? [];

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Owner Dashboard
            </CardTitle>
            <div className="text-lg font-semibold">
              {nextDeadline ? nextDeadline.title : "次の締切なし"}
            </div>
            {nextDeadline ? (
              <div className="text-xs text-muted-foreground">
                {nextDeadline.kind} · {deadlineAt ?? "期限未設定"}
                {remaining ? ` · 残り${remaining}` : ""}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">イベントは未設定です</div>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              eventsRepo.track(
                ANALYTICS_EVENTS.OWNER_DASHBOARD_REMIND_ALL,
                pathname,
                dashboard.circleId
              );
              onRemindAll?.();
            }}
          >
            一括リマインド
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            未確認 {dashboard.counts.unconfirmed}
          </span>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            未払い {dashboard.counts.unpaid}
          </span>
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            出欠未回答 {dashboard.counts.rsvpPending}
          </span>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className={cn("grid w-full", joinRequests.length ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="unconfirmed">未確認</TabsTrigger>
            <TabsTrigger value="unpaid">未払い</TabsTrigger>
            <TabsTrigger value="rsvp">出欠</TabsTrigger>
            {joinRequests.length ? <TabsTrigger value="requests">承認待ち</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="unconfirmed" className={cn("space-y-2", loading && "opacity-60")}>
            {loading ? (
              <div className="text-xs text-muted-foreground">読み込み中...</div>
            ) : (
              <>
                {dashboard.pinnedPost ? (
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="text-xs text-muted-foreground">ピン投稿</div>
                    <div className="text-sm font-medium">{dashboard.pinnedPost.body}</div>
                    {dashboard.pinnedPost.pinDueAt ? (
                      <div className="text-xs text-muted-foreground">
                        期限: {dashboard.pinnedPost.pinDueAt}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {unconfirmed.length ? (
                  renderAvatarRow(unconfirmed)
                ) : (
                  <div className="text-xs text-muted-foreground">{listEmptyLabel}</div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="unpaid" className={cn("space-y-2", loading && "opacity-60")}>
            {loading ? (
              <div className="text-xs text-muted-foreground">読み込み中...</div>
            ) : unpaid.length ? (
              <>
                {unpaid.map((item: UnpaidMemberDto) =>
                  renderMemberRow(item.member, `¥${item.amountYen.toLocaleString("ja-JP")}`)
                )}
                {unpaidRemaining > 0 ? (
                  <div className="text-xs text-muted-foreground">＋残り{unpaidRemaining}</div>
                ) : null}
              </>
            ) : (
              <div className="text-xs text-muted-foreground">{listEmptyLabel}</div>
            )}
          </TabsContent>

          <TabsContent value="rsvp" className={cn("space-y-2", loading && "opacity-60")}>
            {loading ? (
              <div className="text-xs text-muted-foreground">読み込み中...</div>
            ) : rsvp.length ? (
              renderAvatarRow(rsvp)
            ) : (
              <div className="text-xs text-muted-foreground">{listEmptyLabel}</div>
            )}
          </TabsContent>

          {joinRequests.length ? (
            <TabsContent value="requests" className={cn("space-y-2", loading && "opacity-60")}>
              {joinRequests.length ? (
                joinRequests.map((request: JoinRequestDto) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-border/60 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AvatarCircle
                          src={request.member.avatarUrl}
                          nickname={request.member.nickname ?? request.member.initial ?? null}
                          size={28}
                        />
                        <div>
                          <div className="text-sm font-medium">
                            {request.member.nickname ?? request.member.initial ?? "?"}
                          </div>
                          {request.message ? (
                            <div className="text-xs text-muted-foreground">
                              {request.message}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading === request.id}
                          onClick={async () => {
                            if (!dashboard?.circleId) return;
                            setActionLoading(request.id);
                            setActionError(null);
                            try {
                              await joinRequestRepo.approve(
                                dashboard.circleId,
                                request.id
                              );
                              onRefresh?.();
                            } catch (err) {
                              if (
                                err instanceof ApiRequestError &&
                                err.code === "PLAN_CIRCLE_LIMIT"
                              ) {
                                setActionError(
                                  "相手の参加枠がいっぱいで追加できませんでした"
                                );
                              }
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          承認
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading === request.id}
                          onClick={async () => {
                            if (!dashboard?.circleId) return;
                            setActionLoading(request.id);
                            setActionError(null);
                            try {
                              await joinRequestRepo.reject(
                                dashboard.circleId,
                                request.id
                              );
                              onRefresh?.();
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          今回は見送る
                        </Button>
                      </div>
                    </div>
                    {actionError ? (
                      <div className="mt-2 text-xs text-muted-foreground">{actionError}</div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">{listEmptyLabel}</div>
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      </CardContent>

      <CardContent className="space-y-2 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground">
            サークル操作ログ
          </div>
          <Link
            href={`/circles/${dashboard.circleId}/logs`}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            もっと見る
          </Link>
        </div>
        {logLoading ? (
          <div className="text-xs text-muted-foreground">読み込み中...</div>
        ) : logItems.length ? (
          logItems.map((log) => (
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
          <div className="text-xs text-muted-foreground">{logEmptyLabel}</div>
        )}
      </CardContent>
    </Card>
  );
}
