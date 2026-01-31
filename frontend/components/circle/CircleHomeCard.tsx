"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { circleRepo } from "@/lib/repo/circleRepo";
import type { CircleDto } from "@/lib/types";

export default function CircleHomeCard({ circleId }: { circleId: number }) {
  const router = useRouter();
  const [circle, setCircle] = useState<CircleDto | null>(null);

  useEffect(() => {
    circleRepo
      .get(circleId)
      .then((data) => setCircle(data))
      .catch(() => setCircle(null));
  }, [circleId]);

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-muted-foreground">参加中のサークル</div>
          <div className="text-lg font-semibold">{circle?.name ?? "サークル"}</div>
          <div className="text-xs text-muted-foreground">
            チャットで近況を共有しましょう
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/circles/${circleId}/chat`)}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          チャットへ
        </Button>
      </div>
    </Card>
  );
}
