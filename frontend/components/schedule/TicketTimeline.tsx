import { cn } from "@/lib/utils";
import type { TicketStep } from "@/lib/uiTypes";

export default function TicketTimeline({ steps }: { steps: TicketStep[] }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-sm font-semibold text-muted-foreground">チケットの流れ</div>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  "h-3 w-3 rounded-full",
                  step.status === "done" && "bg-[hsl(var(--accent))]",
                  step.status === "current" && "bg-amber-400",
                  step.status === "upcoming" && "bg-muted"
                )}
              />
              {index !== steps.length - 1 ? (
                <span className="mt-1 h-7 w-px bg-border" />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{step.label}</div>
              <div className="text-xs text-muted-foreground">{step.date}</div>
            </div>
            {step.status === "current" ? (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                進行中
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
