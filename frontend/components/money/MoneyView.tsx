"use client";

import SpendLineChart from "@/components/charts/SpendLineChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartData = [1800, 2600, 2400, 3800, 3000, 4400, 3600];

const transactions = [
  { id: "1", title: "ホロカードセット", date: "1/27", amount: 2400 },
  { id: "2", title: "ライブチケット", date: "1/25", amount: 5800 },
  { id: "3", title: "ファンカフェドリンク", date: "1/23", amount: 900 },
];

export default function MoneyView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">今月の支出</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">¥14,200</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            予算 ¥24,000
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">次の出費</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">¥4,000</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            予約グッズ
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>支出トレンド</CardTitle>
          <Button size="sm" variant="secondary">
            予算を設定
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <SpendLineChart data={chartData} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {transactions.map((item) => (
          <Card key={item.id} className="border-border/60 bg-background/90 p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.date}</div>
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
