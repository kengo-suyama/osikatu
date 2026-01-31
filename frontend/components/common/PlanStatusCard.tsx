"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MeDto, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlanStatusCardProps = {
  me: MeDto;
  compact?: boolean;
  className?: string;
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  premium: "Premium",
  plus: "Plus",
};

const resolveEffectiveLabel = (plan: Plan, effectivePlan: Plan, isTrial: boolean) => {
  if (isTrial && plan === "free") return "Premium トライアル中";
  if (plan !== effectivePlan) return `${PLAN_LABELS[effectivePlan]} 相当`;
  return PLAN_LABELS[plan];
};

export default function PlanStatusCard({ me, compact = false, className }: PlanStatusCardProps) {
  const trialDate = me.trialEndsAt ? new Date(me.trialEndsAt) : null;
  const trialTime = trialDate ? trialDate.getTime() : null;
  const hasValidTrial = trialTime !== null && !Number.isNaN(trialTime);
  const isTrialActive = hasValidTrial ? trialTime > Date.now() : false;
  const remainingDays = isTrialActive
    ? Math.max(0, Math.ceil((trialTime - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialLabel = hasValidTrial && trialDate
    ? trialDate.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    : null;
  const mainLabel = resolveEffectiveLabel(me.plan, me.effectivePlan, isTrialActive);
  const showHint = me.plan === "free" || isTrialActive;
  const showSoloHint = me.plan === "free" && !isTrialActive;

  return (
    <Card className={cn("rounded-2xl border p-4 shadow-sm", className)}>
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">プラン</CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-2 p-0", compact && "space-y-1")}>
        <div className="text-lg font-semibold">{mainLabel}</div>
        {isTrialActive ? (
          <div className="text-xs text-muted-foreground">
            トライアル終了: {trialLabel}
            {remainingDays !== null ? ` · 残り${remainingDays}日` : ""}
          </div>
        ) : me.trialEndsAt ? (
          <div className="text-xs text-muted-foreground">トライアル終了: {trialLabel}</div>
        ) : (
          <div className="text-xs text-muted-foreground">現在のプラン: {PLAN_LABELS[me.plan]}</div>
        )}
        {showHint ? (
          <div className="text-xs text-muted-foreground">
            必要になったらいつでもアップグレードできます。
          </div>
        ) : null}
        {showSoloHint ? (
          <div className="text-xs text-muted-foreground">
            個人の推し活ログはこのまま使えます。
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
