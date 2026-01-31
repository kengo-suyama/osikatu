import type { SummaryChip } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

const toneStyles: Record<NonNullable<SummaryChip["tone"]>, string> = {
  accent: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  muted: "bg-muted text-muted-foreground",
  alert: "bg-red-500/15 text-red-600",
};

export default function TodaySummary({ items }: { items: SummaryChip[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            toneStyles[item.tone ?? "muted"]
          )}
        >
          {item.label} {item.value}
        </span>
      ))}
    </div>
  );
}
