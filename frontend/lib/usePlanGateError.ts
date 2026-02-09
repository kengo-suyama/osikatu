"use client";

import { useState, useCallback } from "react";
import { ApiRequestError } from "@/lib/repo/http";

export type PlanGateErrorKind = "upgrade" | "forbidden";
export type PlanGateErrorState = {
  kind: PlanGateErrorKind;
  message: string;
};

export function usePlanGateError() {
  const [planGate, setPlanGate] = useState<PlanGateErrorState | null>(null);

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof ApiRequestError) {
      if (err.status === 402 || err.code === "PLAN_REQUIRED") {
        setPlanGate({
          kind: "upgrade",
          message: err.message || "この機能はPlusプランが必要です",
        });
        return true;
      }
      if (err.status === 403) {
        setPlanGate({
          kind: "forbidden",
          message: "この操作を行う権限がありません",
        });
        return true;
      }
    }
    return false;
  }, []);

  const clearPlanError = useCallback(() => setPlanGate(null), []);

  return { planGate, handleApiError, clearPlanError };
}
