"use client";

import MotionCard from "@/components/motion/MotionCard";
import { MotionFeed, MotionFeedItem } from "@/components/motion/MotionFeed";
import type { LogPost } from "@/lib/uiTypes";

export default function LogList({ logs }: { logs: LogPost[] }) {
  return (
    <MotionFeed className="space-y-3">
      {logs.map((log) => (
        <MotionFeedItem key={log.id}>
          <MotionCard className="p-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{log.title}</div>
              {log.body ? (
                <div className="text-xs text-muted-foreground">{log.body}</div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                {log.date ?? log.time}
              </div>
            </div>
          </MotionCard>
        </MotionFeedItem>
      ))}
    </MotionFeed>
  );
}
