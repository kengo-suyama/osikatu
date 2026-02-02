"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { fetchFortuneHistory } from "@/lib/repo/fortuneRepo";
import type { FortuneDto } from "@/lib/types";

export default function FortunePage() {
  const [items, setItems] = useState<FortuneDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    fetchFortuneHistory()
      .then((data) => {
        if (!canceled) {
          setItems(data);
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div>
        <div className="text-lg font-semibold">運勢履歴</div>
        <div className="text-xs text-muted-foreground">直近7日分の運勢</div>
      </div>

      {loading ? (
        <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
          読み込み中…
        </Card>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          履歴がありません
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={`${item.date}-${item.luckScore}`} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{item.date}</div>
                <div className="text-xs text-muted-foreground">運勢 {item.luckScore}</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{item.message}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
