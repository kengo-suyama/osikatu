import type { MoneySnapshot } from "@/lib/uiTypes";
import { loadString, saveString } from "@/lib/storage";

const BUDGET_KEY = "osikatu:money:budget";

const clampBudget = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export function loadBudget(defaultBudget: number): number {
  const stored = loadString(BUDGET_KEY);
  if (!stored) return defaultBudget;
  const parsed = Number(stored.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return defaultBudget;
  return clampBudget(parsed);
}

export function saveBudget(value: number) {
  saveString(BUDGET_KEY, String(clampBudget(value)));
}

export function applyBudget(snapshot: MoneySnapshot): MoneySnapshot {
  const budget = loadBudget(snapshot.budget);
  const remaining = budget - snapshot.spent;
  return {
    ...snapshot,
    budget,
    remaining,
  };
}
