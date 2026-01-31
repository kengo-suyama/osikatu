import { AlarmClock } from "lucide-react";

import type { DeadlineItem } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

export default function NextDeadlines({ items }: { items: DeadlineItem[] }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-muted-foreground">次の締切</div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "min-w-[160px] rounded-2xl border bg-card p-4 shadow-sm",
              item.level === "urgent" && "border-red-500/40"
            )}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlarmClock className="h-3.5 w-3.5" />
              <span>{item.remain}</span>
            </div>
            <div className="mt-2 text-sm font-semibold">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
