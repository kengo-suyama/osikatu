"use client";

import MotionCard from "@/components/motion/MotionCard";
import { MotionFeed, MotionFeedItem } from "@/components/motion/MotionFeed";
import type { Schedule } from "@/lib/types";

export default function ScheduleList({ list }: { list: Schedule[] }) {
  return (
    <MotionFeed className="space-y-3">
      {list.map((item) => (
        <MotionFeedItem key={item.id}>
          <MotionCard className="p-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
              <div className="text-xs text-muted-foreground">{item.place}</div>
            </div>
          </MotionCard>
        </MotionFeedItem>
      ))}
    </MotionFeed>
  );
}
