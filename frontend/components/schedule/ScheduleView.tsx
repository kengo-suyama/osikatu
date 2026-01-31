import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const upcoming = [
  {
    id: "1",
    title: "配信：冬のQ&A",
    date: "1/30 20:00",
    place: "YouTube",
  },
  {
    id: "2",
    title: "コラボ配信",
    date: "2/02 19:30",
    place: "Twitch",
  },
  {
    id: "3",
    title: "ファンカフェ集合",
    date: "2/06 15:00",
    place: "渋谷",
  },
];

export default function ScheduleView() {
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>次の予定</CardTitle>
          <Button size="sm" variant="secondary">
            リマインド追加
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          配信：冬のQ&A · 1/30 20:00
        </CardContent>
      </Card>

      <div className="space-y-3">
        {upcoming.map((item) => (
          <Card key={item.id} className="border-border/60 bg-background/90 p-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
              <div className="text-xs text-muted-foreground">{item.place}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
