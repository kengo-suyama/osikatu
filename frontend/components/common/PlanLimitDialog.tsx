"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { eventsRepo } from "@/lib/repo/eventsRepo";

export type PlanLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isTrialAvailable?: boolean;
  isTrialActive?: boolean;
  title?: string;
  description?: string;
  manageLabel?: string;
  planLabel?: string;
  continueLabel?: string;
  onManageCircles?: () => void;
  onPlanCompare?: () => void;
  onContinue?: () => void;
};

export default function PlanLimitDialog({
  open,
  onOpenChange,
  isTrialAvailable = false,
  isTrialActive = false,
  title,
  description,
  manageLabel,
  planLabel,
  continueLabel,
  onManageCircles,
  onPlanCompare,
  onContinue,
}: PlanLimitDialogProps) {
  const pathname = usePathname();
  const primaryLabel =
    planLabel ??
    (isTrialAvailable
      ? "7日お試しを使う"
      : isTrialActive
        ? "プランを比較する"
        : "プレミアムで枠を増やす");
  const resolvedTitle = title ?? "参加枠がいっぱいです";
  const resolvedDescription =
    description ??
    "いまのプランでは参加できるサークルは1つまでです。次のいずれかで続けられます。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-3">
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {onManageCircles ? (
            <Button
              variant="secondary"
              onClick={() => {
                onManageCircles?.();
                onOpenChange(false);
              }}
            >
              {manageLabel ?? "参加中のサークルを整理する"}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              onPlanCompare?.();
              eventsRepo.track(ANALYTICS_EVENTS.PLAN_UPGRADE_OPEN, pathname);
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
            {continueLabel ?? "個人モードで続ける"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
