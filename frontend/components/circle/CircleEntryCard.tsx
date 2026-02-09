"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import CircleCreateDialog from "@/components/circle/CircleCreateDialog";
import CircleSearchDialog from "@/components/circle/CircleSearchDialog";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import { ApiRequestError } from "@/lib/repo/http";
import { inviteRepo } from "@/lib/repo/inviteRepo";
import type { CircleDto, MeDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type CircleEntryCardProps = {
  me: MeDto | null;
  onCircleSelected: (circle: CircleDto) => void;
};

const isTrialActive = (trialEndsAt?: string | null) => {
  if (!trialEndsAt) return false;
  const time = new Date(trialEndsAt).getTime();
  return !Number.isNaN(time) && time > Date.now();
};

export default function CircleEntryCard({ me, onCircleSelected }: CircleEntryCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [planLimitOpen, setPlanLimitOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const joinOpenTracked = useRef(false);

  const trialActive = isTrialActive(me?.trialEndsAt ?? null);
  const canCreate = Boolean(me && (me.plan === "plus" || trialActive));
  const trialAvailable = Boolean(me && me.plan === "free" && !me.trialEndsAt);

  const inviteReady = useMemo(() => inviteCode.trim().length > 0, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteReady || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const circle = await inviteRepo.joinByCode(inviteCode.trim());
      onCircleSelected(circle);
      setInviteCode("");
      eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_JOIN_SUBMIT, pathname, circle.id);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "PLAN_CIRCLE_LIMIT") {
        setJoinError(null);
        setPlanLimitOpen(true);
        return;
      }
      setJoinError(err instanceof Error ? err.message : "招待コードが見つかりませんでした");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-muted-foreground">
            あなたの推し活ログ
          </div>
          <div className="text-lg font-semibold">個人モードでそのまま使えます</div>
          <div className="text-xs text-muted-foreground">
            推し登録・予定・支出・ログは招待なしでも利用できます。
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-2">
          <div className="text-sm font-semibold">みんなで推し活、してみる？</div>
          <div className="text-xs text-muted-foreground">
            招待コードを入力するとサークルに参加できます。
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="招待コード"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              onFocus={() => {
                if (!joinOpenTracked.current) {
                  joinOpenTracked.current = true;
                  eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_JOIN_OPEN, pathname);
                }
              }}
            />
            <Button onClick={handleJoin} disabled={!inviteReady || joining}>
              {joining ? "参加中..." : "参加"}
            </Button>
          </div>
          {joinError ? <div className="text-xs text-red-500">{joinError}</div> : null}
        </div>
      </Card>

      <div className="grid gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setSearchOpen(true);
            eventsRepo.track(ANALYTICS_EVENTS.NAV_CIRCLE_SEARCH_OPEN, pathname);
          }}
        >
          サークルを探す
        </Button>
        <Button
          onClick={() => {
            if (!canCreate) {
              setPlanLimitOpen(true);
              return;
            }
            setCreateOpen(true);
            eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_CREATE_OPEN, pathname);
          }}
          data-testid="circle-create-btn"
        >
          サークルを作る
        </Button>
        <div
          className={cn(
            "text-[11px] text-muted-foreground",
            canCreate ? "opacity-70" : "opacity-100"
          )}
        >
          サークル作成・公開管理は Plus 機能です。
          {trialActive ? " トライアル中は作成できます。" : ""}
        </div>
      </div>

      <CircleSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onRequestCreate={() => setCreateOpen(true)}
        onRequestInvite={() => {
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onContinueSolo={() => setSearchOpen(false)}
        me={me ?? undefined}
      />

      <CircleCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        canCreate={canCreate}
        isTrial={trialActive}
        onCreated={(circle) => {
          onCircleSelected(circle);
          setCreateOpen(false);
        }}
      />

      <PlanLimitDialog
        open={planLimitOpen}
        onOpenChange={setPlanLimitOpen}
        isTrialAvailable={trialAvailable}
        isTrialActive={trialActive}
        title="Plusプランが必要です"
        description="サークルの作成・参加にはPlusプランが必要です。"
        onManageCircles={() => router.push("/settings")}
        onPlanCompare={() => router.push("/pricing")}
        onContinue={() => setPlanLimitOpen(false)}
      />
    </div>
  );
}
