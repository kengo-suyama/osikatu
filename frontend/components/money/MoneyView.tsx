"use client";

import SpendLineChart from "@/components/charts/SpendLineChart";
import MotionCard from "@/components/motion/MotionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoneySummary } from "@/lib/types";

export default function MoneyView({ data }: { data: MoneySummary }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>éxèoÉOÉâÉt</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendLineChart data={data.chart} />
        </CardContent>
      </Card>

      {data.items.map((item) => (
        <MotionCard key={item.id} className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
            </div>
            <div className="text-sm font-semibold">
              \{item.amount.toLocaleString("ja-JP")}
            </div>
          </div>
        </MotionCard>
      ))}
    </div>
  );
}
