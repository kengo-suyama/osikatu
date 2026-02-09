"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Wand2 } from "lucide-react";

import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { meRepo } from "@/lib/repo/meRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import type { MeDto } from "@/lib/types";
import type { Oshi } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import { FRAMES, isFrameLocked } from "@/src/ui/frames";

type OshiImageEditorDialogProps = {
  oshiId: string | number;
  currentFrameId?: string | null;
  imageUrl?: string | null;
  onFrameSaved?: (frameId: string, updated?: Oshi | null) => void;
};

export default function OshiImageEditorDialog({
  oshiId,
  currentFrameId,
  imageUrl,
  onFrameSaved,
}: OshiImageEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<MeDto | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState(
    currentFrameId ?? "none"
  );
  const [saving, setSaving] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  useEffect(() => {
    meRepo
      .getMe()
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    setSelectedFrameId(currentFrameId ?? "none");
  }, [currentFrameId, open]);

  const effectivePlan = me?.effectivePlan ?? me?.plan ?? "free";
  const isTrial = Boolean(
    me?.trialActive ??
      (me?.trialEndsAt ? new Date(me.trialEndsAt).getTime() > Date.now() : false)
  );

  const visibleFrames = useMemo(() => FRAMES, []);

  const handleSelect = (frameId: string) => {
    if (isFrameLocked(effectivePlan, isTrial, frameId)) {
      setLimitOpen(true);
      return;
    }
    setSelectedFrameId(frameId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await oshiRepo.updateProfile(oshiId, {
        image_frame_id: selectedFrameId,
      });
      onFrameSaved?.(selectedFrameId, updated ?? null);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-full px-3 text-[11px]"
          >
            <Wand2 className="h-3.5 w-3.5" />
            フレーム
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>フレームを選ぶ</DialogTitle>
            <DialogDescription>
              推しメディアの周囲に装飾を付けます。
            </DialogDescription>
          </DialogHeader>

          {/* Live preview */}
          <div className="mx-auto w-full max-w-[280px]">
            <div
              className="media-frame relative aspect-[16/9] rounded-xl"
              data-frame={selectedFrameId}
              data-testid="frame-preview"
            >
              <div className="media-frame__content h-full w-full overflow-hidden rounded-xl">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="プレビュー"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-100 via-white to-amber-100 text-xs text-muted-foreground">
                    プレビュー
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {visibleFrames.map((frame) => {
              const locked = isFrameLocked(effectivePlan, isTrial, frame.id);
              const active = selectedFrameId === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleSelect(frame.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center text-xs",
                    active ? "border-primary bg-primary/10" : "border-border/60",
                    locked && "opacity-60"
                  )}
                >
                  <div
                    className="media-frame relative h-10 w-full overflow-hidden rounded-lg"
                    data-frame={frame.id}
                  >
                    <div className="media-frame__content flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 via-white to-amber-100" />
                  </div>
                  <div className="flex items-center gap-1">
                    {locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
                    <span className="font-medium leading-tight">{frame.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PlanLimitDialog
        open={limitOpen}
        onOpenChange={setLimitOpen}
        title="プレミアム以上のフレームです"
        description="このフレームはPremium/Plusで解放されます。"
        onPlanCompare={() => setLimitOpen(false)}
        onContinue={() => setLimitOpen(false)}
        continueLabel="閉じる"
        isTrialAvailable={me?.plan === "free" && !me?.trialEndsAt}
        isTrialActive={Boolean(me?.trialActive)}
      />
    </>
  );
}
