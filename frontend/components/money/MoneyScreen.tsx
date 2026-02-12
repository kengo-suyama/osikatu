"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useBudgetState } from "@/lib/budgetState";
import { localYearMonth } from "@/lib/date";
import MoneyChart from "@/components/money/MoneyChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { moneySnapshot } from "@/lib/dummy";
import type { BudgetResponse } from "@/lib/repo/budgetRepo";
import {
  fetchMoneyEntries,
  createMoneyEntry,
  deleteMoneyEntry,
  type MoneyEntry,
} from "@/lib/repo/moneyRepo";

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
  const { budget, loading: budgetLoading, saveBudget } = useBudgetState(defaultBudgetState);
  const [inputs, setInputs] = useState<BudgetResponse>(defaultBudgetState);
  const [message, setMessage] = useState<string | null>(null);

  // Ledger state
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Load entries for current month
  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const data = await fetchMoneyEntries(from, to);
      setEntries(data);
    } catch {
      // ignore
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Monthly summary
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.type === "income") income += e.amountJpy;
      else expense += e.amountJpy;
    }
    return { income, expense, diff: income - expense };
  }, [entries]);

  const handleAddEntry = async () => {
    if (!formAmount || Number(formAmount) <= 0) return;
    setSaving(true);
    try {
      await createMoneyEntry({
        date: formDate,
        type: formType,
        amount_jpy: Number(formAmount),
        category: formCategory || undefined,
        note: formNote || undefined,
      });
      setShowForm(false);
      setFormAmount("");
      setFormCategory("");
      setFormNote("");
      void loadEntries();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMoneyEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4" data-testid="money-page">
      {/* Budget summary */}
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

      {/* Monthly summary */}
      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="money-summary">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月の収支</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 p-0 text-center text-sm">
          <div>
            <div className="text-xs text-muted-foreground">収入</div>
            <div className="font-semibold text-green-600">
              ¥{summary.income.toLocaleString("ja-JP")}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">支出</div>
            <div className="font-semibold text-red-500">
              ¥{summary.expense.toLocaleString("ja-JP")}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">差引</div>
            <div className={`font-semibold ${summary.diff >= 0 ? "text-green-600" : "text-red-500"}`}>
              ¥{summary.diff.toLocaleString("ja-JP")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add entry button */}
      {!showForm ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
          data-testid="money-add-open"
        >
          <Plus className="mr-1 h-4 w-4" />
          収支を追加
        </Button>
      ) : (
        <Card className="rounded-2xl border p-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormType("expense")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  formType === "expense" ? "border-red-300 bg-red-50 text-red-700" : "text-muted-foreground"
                }`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => setFormType("income")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  formType === "income" ? "border-green-300 bg-green-50 text-green-700" : "text-muted-foreground"
                }`}
              >
                収入
              </button>
            </div>
            <Input
              type="number"
              placeholder="金額"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              min={1}
              data-testid="money-add-amount"
            />
            <Input
              type="text"
              placeholder="カテゴリ（任意）"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              data-testid="money-add-category"
            />
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              data-testid="money-add-date"
            />
            <Input
              type="text"
              placeholder="メモ（任意）"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleAddEntry}
                disabled={saving || !formAmount}
                data-testid="money-add-submit"
              >
                {saving ? "保存中..." : "追加"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entry list */}
      <div className="space-y-3" data-testid="money-list">
        {loadingEntries ? (
          <div className="py-4 text-center text-sm opacity-70">読み込み中…</div>
        ) : entries.length === 0 ? (
          <div className="py-4 text-center text-sm opacity-70">今月の記録がありません</div>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">
                    <span className={`mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      entry.type === "income"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {entry.type === "income" ? "収入" : "支出"}
                    </span>
                    {entry.category ?? "未分類"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.date}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-semibold ${
                    entry.type === "income" ? "text-green-600" : "text-red-500"
                  }`}>
                    {entry.type === "income" ? "+" : "-"}¥{entry.amountJpy.toLocaleString("ja-JP")}
                  </div>
                  <button
                    type="button"
                    aria-label="削除"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
