"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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
import { Switch } from "@/components/ui/switch";
import TagInput from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { circleRepo } from "@/lib/repo/circleRepo";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import type { CircleDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlanGateErrorBanner } from "@/components/PlanGateErrorBanner";

type CircleCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  isTrial: boolean;
  onCreated?: (circle: CircleDto) => void;
};

const sanitizeTags = (tags: string[]) => {
  const cleaned = tags
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(cleaned)).slice(0, 3);
};

export default function CircleCreateDialog({
  open,
  onOpenChange,
  canCreate,
  isTrial,
  onCreated,
}: CircleCreateDialogProps) {
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [oshiLabel, setOshiLabel] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [joinPolicy, setJoinPolicy] = useState<"request" | "instant">("request");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTags = useMemo(() => sanitizeTags(tags), [tags]);
  const canSubmit = useMemo(() => {
    return (
      canCreate &&
      name.trim().length > 0 &&
      oshiLabel.trim().length > 0 &&
      normalizedTags.length >= 1 &&
      normalizedTags.length <= 3
    );
  }, [canCreate, name, oshiLabel, normalizedTags]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await circleRepo.create({
        name: name.trim(),
        description: description.trim() || null,
        oshiLabel: oshiLabel.trim(),
        oshiTags: normalizedTags,
        isPublic,
        joinPolicy,
      });
      eventsRepo.track(ANALYTICS_EVENTS.CIRCLE_CREATE_SUBMIT, pathname, created.id, {
        isPublic,
        joinPolicy,
      });
      onCreated?.(created);
      setName("");
      setDescription("");
      setOshiLabel("");
      setTags([]);
      setIsPublic(false);
      setJoinPolicy("request");
      handleClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="space-y-3">
        <DialogHeader>
          <DialogTitle>サークルを作成</DialogTitle>
          <DialogDescription>
            推しタグと公開設定は後から変更できます。
          </DialogDescription>
        </DialogHeader>

        {!canCreate && (
          <PlanGateErrorBanner
            message="サークル作成にはPlusプランが必要です"
            kind="upgrade"
          />
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Step 1 · 基本情報</div>
            <div className="space-y-2">
              <Input
                placeholder="サークル名（必須）"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canCreate}
              />
              <Textarea
                placeholder="説明（任意・140字まで）"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                disabled={!canCreate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Step 2 · 推し情報</div>
            <div className="space-y-2">
              <Input
                placeholder="推し対象（必須）例：なにわ男子 / 原神 / ソラ"
                value={oshiLabel}
                onChange={(event) => setOshiLabel(event.target.value)}
                disabled={!canCreate}
              />
              <div className="space-y-1">
                <TagInput
                  value={normalizedTags}
                  onChange={(next) => setTags(sanitizeTags(next))}
                  placeholder="推しタグを追加（最大3つ）"
                  className={cn(!canCreate && "opacity-60")}
                  disabled={!canCreate}
                />
                <div className="text-[11px] text-muted-foreground">
                  推しタグは検索や同担発見に使います（1〜3個まで）
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Step 3 · 公開設定</div>
            <Card className={cn("rounded-xl border p-3", !canCreate && "opacity-60")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">サークルを検索に公開する</div>
                  <div className="text-xs text-muted-foreground">
                    招待や承認が必要なまま、検索に表示できます
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  disabled={!canCreate}
                />
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <div>ON: 推しタグ検索やおすすめに表示されます</div>
                <div>OFF: 招待コードを知っている人のみ参加できます</div>
              </div>
            </Card>
            <Card className={cn("rounded-xl border p-3", !canCreate && "opacity-60")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">即参加を許可する</div>
                  <div className="text-xs text-muted-foreground">
                    OFF で承認制（安心）になります
                  </div>
                </div>
                <Switch
                  checked={joinPolicy === "instant"}
                  onCheckedChange={(checked) =>
                    setJoinPolicy(checked ? "instant" : "request")
                  }
                  disabled={!canCreate}
                />
              </div>
            </Card>
          </div>

          <Card
            className={cn(
              "rounded-xl border border-dashed p-3 text-xs text-muted-foreground",
              canCreate ? "bg-muted/40" : "bg-muted"
            )}
          >
            サークル作成・公開管理は Plus 機能です。{isTrial ? "トライアル中は作成できます。" : ""}
          </Card>
        </div>

        {error ? <div className="text-xs text-red-500">{error}</div> : null}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "作成中..." : "作成する"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
