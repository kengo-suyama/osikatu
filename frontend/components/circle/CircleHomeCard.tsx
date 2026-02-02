"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/events";
import { circleRepo } from "@/lib/repo/circleRepo";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import type { CircleDto } from "@/lib/types";

export default function CircleHomeCard({ circleId }: { circleId: number }) {
  const router = useRouter();
  const pathname = usePathname();
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
            サークルのハブに移動します
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            eventsRepo.track(ANALYTICS_EVENTS.NAV_CIRCLE_HOME, pathname, circleId, {
              from: "circleCard",
            });
            router.push(`/circles/${circleId}`);
          }}
        >
          <Home className="mr-2 h-4 w-4" />
          サークルHomeへ
        </Button>
      </div>
    </Card>
  );
}
