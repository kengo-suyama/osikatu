"use client";

import { useState } from "react";

import MotionTabs from "@/components/motion/MotionTabs";
import MotionModal from "@/components/motion/MotionModal";
import MotionCard from "@/components/motion/MotionCard";
import { MotionFeed, MotionFeedItem } from "@/components/motion/MotionFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import QuickLogDialog from "@/components/home/QuickLogDialog";
import type { HomeSummary } from "@/lib/types";

const tabItems = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
];

type HomeViewProps = {
  data: HomeSummary;
};

export default function HomeView({ data }: HomeViewProps) {
  const [tab, setTab] = useState("today");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-4">
      <MotionTabs tabs={tabItems} value={tab} onValueChange={setTab}>
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">推し活時間</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.todayTime}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">支出</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {data.todaySpend}
              </CardContent>
            </Card>
          </div>

          <QuickLogDialog />

          <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(true)}>
            クイック操作
          </Button>

          <MotionFeed>
            {data.logs.map((log) => (
              <MotionFeedItem key={log.id}>
                <MotionCard className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{log.title}</div>
                      {log.note ? (
                        <div className="text-xs text-muted-foreground">{log.note}</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.time ?? log.date}
                    </div>
                  </div>
                </MotionCard>
              </MotionFeedItem>
            ))}
          </MotionFeed>
        </TabsContent>

        <TabsContent value="week" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>週サマリー</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              週次の集計は後続で追加予定です。
            </CardContent>
          </Card>
          <MotionCard className="p-4">
            <div className="text-sm text-muted-foreground">
              今週のハイライトをここに表示します。
            </div>
          </MotionCard>
        </TabsContent>
      </MotionTabs>

      <MotionModal open={sheetOpen} onOpenChange={setSheetOpen} title="クイック操作">
        <Button className="w-full">ログを書く</Button>
        <Button variant="secondary" className="w-full">
          支出を追加
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setSheetOpen(false)}>
          閉じる
        </Button>
      </MotionModal>
    </div>
  );
}
