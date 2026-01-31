import NextDeadlines from "@/components/widgets/NextDeadlines";
import TicketTimeline from "@/components/schedule/TicketTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deadlines, scheduleList, ticketTimeline } from "@/lib/dummy";

export default function ScheduleScreen() {
  const hasConflict = scheduleList.some((item) => item.conflict);

  return (
    <div className="space-y-4">
      {hasConflict ? (
        <Card className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 shadow-sm">
          <div className="text-sm font-semibold text-red-600">予定が重なっています</div>
          <div className="text-xs text-muted-foreground">
            2/02 のコラボ配信が別予定と重なっています。
          </div>
        </Card>
      ) : null}

      <TicketTimeline steps={ticketTimeline} />

      <NextDeadlines items={deadlines} />

      <Card className="rounded-2xl border p-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">次の予定</CardTitle>
          <Button size="sm" variant="secondary">
            追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {scheduleList.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/60 p-3">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
              <div className="text-xs text-muted-foreground">{item.place}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
