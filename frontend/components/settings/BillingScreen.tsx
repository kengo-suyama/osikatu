"use client";

import { useEffect, useState } from "react";

import { billingRepo } from "@/lib/repo/billingRepo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan, PlanStatusDto } from "@/lib/types";

export default function BillingScreen() {
  const [status, setStatus] = useState<PlanStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingRepo
      .getPlan()
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const plan = status?.plan ?? "free";
  const planStatus = status?.planStatus ?? "active";

  const handlePlanChange = async (nextPlan: Plan) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await billingRepo.updatePlan(nextPlan);
      setStatus(updated);
    } catch {
      setError("プランの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("解約してもよろしいですか？");
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await billingRepo.cancelPlan();
      setStatus(updated);
    } catch {
      setError("解約に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            現在のプラン
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {loading ? (
            <div className="text-sm text-muted-foreground">読み込み中...</div>
          ) : (
            <>
              <div className="text-lg font-semibold">{plan.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">
                状態: {planStatus === "canceled" ? "解約済み" : "有効"}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            プラン変更
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <Select value={plan} onValueChange={(value) => handlePlanChange(value as Plan)}>
            <SelectTrigger>
              <SelectValue placeholder="プランを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="plus">Plus</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            反映には数秒かかることがあります。
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">解約</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          <div className="text-xs text-muted-foreground">
            解約するとFree扱いになります。アカウント削除は別途対応します。
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            data-testid="billing-cancel"
          >
            解約
          </Button>
        </CardContent>
      </Card>

      {error ? <div className="text-xs text-red-500">{error}</div> : null}
      {saving ? <div className="text-xs text-muted-foreground">反映中...</div> : null}
    </div>
  );
}
