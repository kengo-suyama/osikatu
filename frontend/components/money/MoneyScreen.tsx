"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useBudgetState } from "@/lib/budgetState";
import { localYearMonth } from "@/lib/date";
import { fetchExpensesSummary } from "@/lib/repo/expenseRepo";
import MoneyChart from "@/components/money/MoneyChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BudgetResponse } from "@/lib/repo/budgetRepo";
import type { ExpensesByCategoryDto } from "@/lib/types";
import type { MoneyCategory } from "@/lib/uiTypes";

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return y + "年" + Number(m) + "月";
}

export default function MoneyScreen() {
  const currentMonth = useMemo(() => localYearMonth(), []);
  const defaultBudgetState = useMemo<BudgetResponse>(
    () => ({ budget: 0, spent: 0, yearMonth: currentMonth, updatedAt: null }),
    [currentMonth]
  );
  const { budget, loading: budgetLoading, saveBudget } = useBudgetState(defaultBudgetState);
  const [inputs, setInputs] = useState<BudgetResponse>(defaultBudgetState);
  const [message, setMessage] = useState<string | null>(null);

  const [month, setMonth] = useState(currentMonth);
  const [totalAmount, setTotalAmount] = useState(0);
  const [byCategory, setByCategory] = useState<ExpensesByCategoryDto[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    setInputs(budget);
  }, [budget]);

  const remaining = Math.max(budget.budget - budget.spent, 0);

  const fetchSummary = useCallback(async (ym: string) => {
    setSummaryLoading(true);
    try {
      const data = await fetchExpensesSummary({ yearMonth: ym });
      setTotalAmount(data.totalAmount ?? 0);
      setByCategory(data.byCategory ?? []);
    } catch {
      setTotalAmount(0);
      setByCategory([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(month);
  }, [month, fetchSummary]);

  const categories: MoneyCategory[] = byCategory.map((c, i) => ({
    id: "cat-" + i,
    label: c.category || "未分類",
    amount: c.totalAmount,
  }));

  const handleSave = async () => {
    setMessage(null);
    try {
      const next = await saveBudget(inputs);
      setInputs(next);
      setMessage("保存しました");
    } catch {
      setMessage("保存に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between" data-testid="money-month-nav">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          data-testid="money-month-prev"
        >
          ←
        </Button>
        <span className="text-sm font-semibold" data-testid="money-month-label">
          {formatMonth(month)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={month >= currentMonth}
          data-testid="money-month-next"
        >
          →
        </Button>
      </div>

      {/* Budget overview */}
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="space-y-1 p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月あといくら？</CardTitle>
          <div className="text-3xl font-semibold" data-testid="money-remaining">
            ¥{remaining.toLocaleString("ja-JP")}
          </div>
          <div className="text-xs text-muted-foreground">
            予算 ¥{budget.budget.toLocaleString("ja-JP")} · 使用済み ¥
            {budget.spent.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className="h-44 p-0">
          {categories.length > 0 ? (
            <MoneyChart categories={categories} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              データなし
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="money-category-card">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            カテゴリ別{summaryLoading ? "（読込中…）" : ""}
          </CardTitle>
          <div className="text-2xl font-semibold" data-testid="money-total">
            ¥{totalAmount.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {categories.length === 0 ? (
            <div className="text-xs text-muted-foreground">この月の支出はありません</div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between text-sm"
                data-testid="money-category-row"
              >
                <span>{cat.label}</span>
                <span className="font-semibold">¥{cat.amount.toLocaleString("ja-JP")}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Budget settings */}
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">予算設定</CardTitle>
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={budgetLoading}>
            {budgetLoading ? "保存中..." : "更新"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          <Input
            type="number"
            value={inputs.budget}
            onChange={(event) =>
              setInputs((prev) => ({ ...prev, budget: Number(event.target.value) }))
            }
            placeholder="例）24000"
            min={0}
          />
          {message ? (
            <div className="text-xs text-muted-foreground">{message}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
