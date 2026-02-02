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
  onFrameSaved?: (frameId: string, updated?: Oshi | null) => void;
};

export default function OshiImageEditorDialog({
  oshiId,
  currentFrameId,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フレームを選ぶ</DialogTitle>
            <DialogDescription>
              選んだフレームは推しメディアに反映されます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleFrames.map((frame) => {
              const locked = isFrameLocked(effectivePlan, isTrial, frame.id);
              const active = selectedFrameId === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleSelect(frame.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border px-3 py-2 text-left text-xs",
                    active ? "border-primary bg-primary/10" : "border-border/60",
                    locked && "opacity-70"
                  )}
                >
                  <div
                    className="media-frame relative h-16 w-full overflow-hidden rounded-lg border bg-muted/40"
                    data-frame={frame.id}
                  >
                    <div className="media-frame__content flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 via-white to-amber-100 text-[10px] text-muted-foreground">
                      SAMPLE
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{frame.label}</span>
                    {locked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
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
