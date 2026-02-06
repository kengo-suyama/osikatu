"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { circleRepo } from "@/lib/repo/circleRepo";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import type { CircleDto, MeDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type CircleSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestCreate: () => void;
  onRequestInvite: () => void;
  onContinueSolo: () => void;
  me?: MeDto | null;
};

const renderTags = (circle: CircleDto) => {
  const tags = circle.oshiTags?.length ? circle.oshiTags : circle.oshiTag ? [circle.oshiTag] : [];
  return tags.map((tag) => (
    <span
      key={tag}
      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
    >
      #{tag}
    </span>
  ));
};

export default function CircleSearchDialog({
  open,
  onOpenChange,
  onRequestCreate,
  onRequestInvite,
  onContinueSolo,
  me,
}: CircleSearchDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tag, setTag] = useState("");
  const [oshiLabel, setOshiLabel] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<CircleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planLimitOpen, setPlanLimitOpen] = useState(false);

  const normalizedTag = useMemo(() => tag.replace(/^#/, "").trim(), [tag]);
  const normalizedLabel = useMemo(() => oshiLabel.trim(), [oshiLabel]);
  const normalizedName = useMemo(() => name.trim(), [name]);
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await circleRepo.search({
        tag: normalizedTag || undefined,
        oshi: normalizedLabel || undefined,
        q: normalizedName || undefined,
      });
      setResults(list);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTag("");
      setOshiLabel("");
      setName("");
      setResults([]);
      setSearched(false);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const showEmpty = searched && !loading && results.length === 0;
  const trialEndsAt = me?.trialEndsAt ?? null;
  const trialTime = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const isTrialActive = trialTime !== null && !Number.isNaN(trialTime) && trialTime > Date.now();
  const isTrialAvailable = me?.plan === "free" && !trialEndsAt;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="space-y-3">
        <DialogHeader>
          <DialogTitle>サークルを探す</DialogTitle>
          <DialogDescription>推しタグや推し対象で検索できます。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="推しタグで検索（例: #ソラ）"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          />
          <Input
            placeholder="推し対象で検索（例: なにわ男子）"
            value={oshiLabel}
            onChange={(event) => setOshiLabel(event.target.value)}
          />
          <Input
            placeholder="サークル名で検索（任意）"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "検索中..." : "検索する"}
          </Button>
          {error ? <div className="text-xs text-red-500">{error}</div> : null}
        </div>

        {showEmpty ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold">検索結果 0 件</div>
            <div className="text-xs text-muted-foreground">
              まだピッタリのサークルが見つかりませんでした。でも大丈夫。
            </div>
            <div className="grid gap-2">
              <Card className="rounded-xl border p-3">
                <div className="text-sm font-medium">＋ この推しでサークルを作る</div>
                <div className="text-xs text-muted-foreground">
                  同じ推しの人を集めてみませんか？
                </div>
                <Button
                  className="mt-2"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    handleClose(false);
                    eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_CREATE_OPEN, pathname);
                    onRequestCreate();
                  }}
                >
                  作成へ
                </Button>
              </Card>
              <Card className="rounded-xl border p-3">
                <div className="text-sm font-medium">👤 個人で推し活を続ける</div>
                <div className="text-xs text-muted-foreground">
                  ログ・予定・支出管理はそのまま使えます
                </div>
                <Button
                  className="mt-2"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    handleClose(false);
                    eventsRepo.track(ANALYTICS_EVENTS.NAV_HOME, pathname);
                    onContinueSolo();
                  }}
                >
                  このまま続ける
                </Button>
              </Card>
              <Card className="rounded-xl border p-3">
                <div className="text-sm font-medium">🔗 招待コードを入力する</div>
                <div className="text-xs text-muted-foreground">
                  知り合いから招待をもらっている場合はこちら
                </div>
                <Button
                  className="mt-2"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    handleClose(false);
                    eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_JOIN_OPEN, pathname);
                    onRequestInvite();
                  }}
                >
                  招待コード入力
                </Button>
              </Card>
            </div>
            <div className="text-[11px] text-muted-foreground">
              ※ サークル参加はあとからでも大丈夫です
            </div>
          </div>
        ) : null}

        {!showEmpty && results.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold">検索結果</div>
            <div className="space-y-2">
              {results.map((circle) => {
                const activity = resolveActivityLabel(circle);
                return (
                <Card key={circle.id} className="rounded-xl border p-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span>{circle.name}</span>
                      {activity ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            activity.className
                          )}
                        >
                          {activity.text}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      推し対象: {circle.oshiLabel ?? "未設定"} · メンバー {circle.memberCount}
                    </div>
                    <div className="flex flex-wrap gap-2">{renderTags(circle)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      招待制のサークルです（招待コードが必要です）
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          handleClose(false);
                          eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_JOIN_OPEN, pathname);
                          onRequestInvite();
                        }}
                      >
                        招待コード入力
                      </Button>
                    </div>
                  </div>
                </Card>
              );
              })}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                handleClose(false);
                onRequestInvite();
              }}
            >
              招待コードを入力する
            </Button>
          </div>
        ) : null}

        {!searched ? (
          <div className={cn("text-xs text-muted-foreground", loading && "opacity-60")}>
            迷ったら推しタグから探すのがおすすめです。
          </div>
        ) : null}

        <PlanLimitDialog
          open={planLimitOpen}
          onOpenChange={setPlanLimitOpen}
          isTrialAvailable={isTrialAvailable}
          isTrialActive={isTrialActive}
          onManageCircles={() => router.push("/settings")}
          onPlanCompare={() => router.push("/settings")}
          onContinue={() => onContinueSolo()}
        />
      </DialogContent>
    </Dialog>
  );
}
const resolveActivityLabel = (circle: CircleDto) => {
  if (!circle.lastActivityAt) return null;
  const time = new Date(circle.lastActivityAt).getTime();
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
  return null;
};
