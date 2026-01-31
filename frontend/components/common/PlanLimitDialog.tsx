"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PlanLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isTrialAvailable?: boolean;
  isTrialActive?: boolean;
  onManageCircles?: () => void;
  onPlanCompare?: () => void;
  onContinue?: () => void;
};

export default function PlanLimitDialog({
  open,
  onOpenChange,
  isTrialAvailable = false,
  isTrialActive = false,
  onManageCircles,
  onPlanCompare,
  onContinue,
}: PlanLimitDialogProps) {
  const primaryLabel = isTrialAvailable
    ? "7日お試しを使う"
    : isTrialActive
      ? "プランを比較する"
      : "プレミアムで枠を増やす";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-3">
        <DialogHeader>
          <DialogTitle>参加枠がいっぱいです</DialogTitle>
          <DialogDescription>
            いまのプランでは参加できるサークルは1つまでです。次のいずれかで続けられます。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              onManageCircles?.();
              onOpenChange(false);
            }}
          >
            参加中のサークルを整理する
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              onPlanCompare?.();
              onOpenChange(false);
            }}
          >
            {primaryLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onContinue?.();
              onOpenChange(false);
            }}
          >
            個人モードで続ける
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
