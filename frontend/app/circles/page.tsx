"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { circleRepo } from "@/lib/repo/circleRepo";
import type { CircleDto } from "@/lib/types";

export default function CirclesPage() {
  const [circles, setCircles] = useState<CircleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    circleRepo
      .list()
      .then((items) => {
        if (!mounted) return;
        setCircles(items);
      })
      .catch(() => {
        if (!mounted) return;
        setCircles([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-6">
      <div className="text-lg font-semibold">参加中のサークル</div>
      {loading ? (
        <div className="text-sm text-muted-foreground">読み込み中...</div>
      ) : circles.length ? (
        <div className="space-y-2">
          {circles.map((circle) => (
            <Link
              key={circle.id}
              href={`/circles/${circle.id}`}
              className="block rounded-2xl border p-4 text-sm transition hover:bg-muted/30"
            >
              <div className="font-semibold">{circle.name}</div>
              <div className="text-xs text-muted-foreground">
                推し対象: {circle.oshiLabel ?? "未設定"} · メンバー {circle.memberCount}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
          参加中のサークルがありません。Homeからサークル参加/作成ができます。
        </div>
      )}
      <Link href="/home" className="text-sm underline">
        Homeへ戻る
      </Link>
    </div>
  );
}
