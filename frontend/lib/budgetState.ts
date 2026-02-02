import { useEffect, useState } from "react";

import { isApiMode } from "@/lib/config";
import { fetchBudget, updateBudget, type BudgetResponse } from "@/lib/repo/budgetRepo";

const BUDGET_EVENT = "osikatu:budget:updated";

let cachedBudget: BudgetResponse | null = null;

const emitBudget = (budget: BudgetResponse) => {
  cachedBudget = budget;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BUDGET_EVENT, { detail: budget }));
  }
};

export function useBudgetState(defaultState: BudgetResponse) {
  const [budget, setBudget] = useState<BudgetResponse>(
    cachedBudget ?? defaultState
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cachedBudget) {
      setBudget(cachedBudget);
      return;
    }
    let mounted = true;
    setLoading(true);
    fetchBudget()
      .then((data) => {
        if (!mounted) return;
        emitBudget(data);
        setBudget(data);
      })
      .catch(() => {
        if (!mounted) return;
        setBudget(defaultState);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [defaultState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<BudgetResponse>).detail;
      if (detail) setBudget(detail);
    };
    window.addEventListener(BUDGET_EVENT, handler);
    return () => {
      window.removeEventListener(BUDGET_EVENT, handler);
    };
  }, []);

  const refreshBudget = async () => {
    setLoading(true);
    try {
      const next = isApiMode() ? await fetchBudget() : defaultState;
      emitBudget(next);
      setBudget(next);
      return next;
    } catch {
      setBudget(defaultState);
      return defaultState;
    } finally {
      setLoading(false);
    }
  };

  const saveBudget = async (payload: BudgetResponse) => {
    setLoading(true);
    try {
      const next = isApiMode() ? await updateBudget(payload) : payload;
      emitBudget(next);
      setBudget(next);
      return next;
    } finally {
      setLoading(false);
    }
  };

  return {
    budget,
    loading,
    refreshBudget,
    saveBudget,
  };
}
