"use client";

import { useEffect, useMemo, useState } from "react";

import { useBudgetState } from "@/lib/budgetState";
import { localYearMonth } from "@/lib/date";
import MoneyChart from "@/components/money/MoneyChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { moneySnapshot, moneyTransactions } from "@/lib/dummy";
import type { BudgetResponse } from "@/lib/repo/budgetRepo";

export default function MoneyScreen() {
  const defaultBudgetState = useMemo<BudgetResponse>(() => {
    const currentMonth = localYearMonth();
    return {
      budget: moneySnapshot.budget,
      spent: moneySnapshot.spent,
      yearMonth: currentMonth,
      updatedAt: null,
    };
  }, []);
  const { budget, loading, saveBudget } = useBudgetState(defaultBudgetState);
  const [inputs, setInputs] = useState<BudgetResponse>(defaultBudgetState);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setInputs(budget);
  }, [budget]);

  const remaining = Math.max(budget.budget - budget.spent, 0);

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
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="space-y-1 p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月あといくら？</CardTitle>
          <div className="text-3xl font-semibold">
            ¥{remaining.toLocaleString("ja-JP")}
          </div>
          <div className="text-xs text-muted-foreground">
            予算 ¥{budget.budget.toLocaleString("ja-JP")} · 使用済み ¥
            {budget.spent.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className="h-44 p-0">
          <MoneyChart categories={moneySnapshot.categories} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">予算設定</CardTitle>
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={loading}>
            {loading ? "保存中..." : "更新"}
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

      <div className="space-y-3">
        {moneyTransactions.map((item) => (
          <Card key={item.id} className="rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.date} · {item.category}
                </div>
              </div>
              <div className="text-sm font-semibold">
                ¥{item.amount.toLocaleString("ja-JP")}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
