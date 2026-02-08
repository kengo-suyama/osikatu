"use client";

import { useState, useCallback } from "react";
import { ApiRequestError } from "@/lib/repo/http";

export function usePlanGateError() {
  const [planError, setPlanError] = useState<string | null>(null);

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof ApiRequestError) {
      if (err.status === 402 || err.code === "PLAN_REQUIRED") {
        setPlanError(err.message || "この機能はPlusプランが必要です");
        return true;
      }
      if (err.status === 403) {
        setPlanError("この操作を行う権限がありません");
        return true;
      }
    }
    return false;
  }, []);

  const clearPlanError = useCallback(() => setPlanError(null), []);

  return { planError, handleApiError, clearPlanError };
}
