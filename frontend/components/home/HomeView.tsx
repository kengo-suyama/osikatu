"use client";

import { useState } from "react";

import MotionFeed, { FeedItem } from "@/components/MotionFeed";
import MotionModal from "@/components/MotionModal";
import MotionTabs from "@/components/MotionTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const tabItems = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
];

const todayFeed: FeedItem[] = [
  {
    id: "1",
    name: "ミカ",
    handle: "@mika",
    time: "2時間前",
    content:
      "アンコール最高すぎた…！新セトリの流れがめちゃくちゃ良くて、B席から見たライトのシンクロが神だった。",
    tags: ["ライブ", "アンコール", "ライト"],
    badge: "ライブ",
    likes: 128,
    comments: 24,
    reposts: 6,
  },
  {
    id: "2",
    name: "ユナ",
    handle: "@yuna",
    time: "4時間前",
    content:
      "新作グッズ無事確保！ホロカードとフーディー。今季のパステル配色ほんと可愛い。",
    tags: ["グッズ", "ドロップ"],
    badge: "購入",
    likes: 96,
    comments: 12,
    reposts: 3,
  },
  {
    id: "3",
    name: "ルイ",
    handle: "@rui",
    time: "6時間前",
    content:
      "配信のアーカイブ見ながら無配作り。次の現場までにラメテープ補充しなきゃ。",
    tags: ["工作", "アーカイブ"],
    likes: 74,
    comments: 9,
    reposts: 2,
  },
];

const weekFeed: FeedItem[] = [
  {
    id: "4",
    name: "ミカ",
    handle: "@mika",
    time: "月",
    content:
      "今週まとめ：配信3本、コラボ1回、グッズ勝ち2回。いちばん刺さったのはアコースティックカバー。",
    tags: ["まとめ"],
    badge: "今週",
    likes: 210,
    comments: 31,
    reposts: 12,
  },
  {
    id: "5",
    name: "ユナ",
    handle: "@yuna",
    time: "水",
    content:
      "ファンカフェ集合決定。みんなの予定合わせるボード作成中。",
    tags: ["集合", "予定"],
    likes: 88,
    comments: 14,
    reposts: 4,
  },
];

export default function HomeView() {
  const [tab, setTab] = useState("today");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50/90 via-white to-amber-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">推し活時間</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">1時間40分</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            目標 2時間
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-sky-50/90 via-white to-rose-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">今日の支出</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">¥2,800</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            予算 ¥12,000
          </CardContent>
        </Card>
      </div>

      <MotionTabs tabs={tabItems} value={tab} onValueChange={setTab}>
        <TabsContent value="today" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">今日のフィード</div>
              <p className="text-xs text-muted-foreground">
                ライブメモ・グッズ・ハイライトをまとめて。
              </p>
            </div>
            <MotionModal
              title="クイックログ"
              description="今の気持ちをそのまま残そう。"
              trigger={<Button size="sm">クイックログ</Button>}
            >
              <div className="space-y-3">
                <Input placeholder="タイトル" />
                <Textarea placeholder="いちばん刺さった瞬間は？" rows={3} />
                <div className="grid grid-cols-2 gap-2">
                  <Button>保存</Button>
                  <Button variant="secondary">保存して共有</Button>
                </div>
              </div>
            </MotionModal>
          </div>
          <MotionFeed items={todayFeed} />
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>今週のまとめ</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              配信3本、集合1回、グッズ勝ち2回。ベストはアコースティックカバー回。
            </CardContent>
          </Card>
          <MotionFeed items={weekFeed} />
        </TabsContent>
      </MotionTabs>
    </div>
  );
}
