"use client";

import MoneyChart from "@/components/money/MoneyChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { moneySnapshot, moneyTransactions } from "@/lib/dummy";

export default function MoneyScreen() {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="space-y-1 p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">今月あといくら？</CardTitle>
          <div className="text-3xl font-semibold">
            ¥{moneySnapshot.remaining.toLocaleString("ja-JP")}
          </div>
          <div className="text-xs text-muted-foreground">
            予算 ¥{moneySnapshot.budget.toLocaleString("ja-JP")} · 使用済み ¥
            {moneySnapshot.spent.toLocaleString("ja-JP")}
          </div>
        </CardHeader>
        <CardContent className="h-44 p-0">
          <MoneyChart categories={moneySnapshot.categories} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">予算設定</CardTitle>
          <Button variant="secondary" size="sm">
            更新
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Input placeholder="例）24000" />
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
