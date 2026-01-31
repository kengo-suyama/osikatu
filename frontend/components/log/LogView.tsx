"use client";

import { useState } from "react";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const posts = [
  {
    id: "1",
    name: "ミカ",
    handle: "@mika",
    time: "10分前",
    content:
      "セトリ更新！新イントロは生で聴くと破壊力すごい。最初から最後まで歓声が止まらなかった。",
    likes: 42,
    comments: 8,
    reposts: 2,
  },
  {
    id: "2",
    name: "ユナ",
    handle: "@yuna",
    time: "1時間前",
    content:
      "トレカ用バインダーのレイアウト完成。今季はパステル×ネオンのグリッドで統一。",
    likes: 88,
    comments: 16,
    reposts: 6,
  },
  {
    id: "3",
    name: "ルイ",
    handle: "@rui",
    time: "3時間前",
    content:
      "配信まとめ：サプライズデュエットが優勝。あとで切り抜き作る。",
    likes: 64,
    comments: 12,
    reposts: 4,
  },
];

const getInitials = (name: string) => name.slice(0, 1).toUpperCase();

export default function LogView() {
  const [open, setOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const handleSave = () => {
    setOpen(false);
    setToastOpen(true);
  };

  return (
    <ToastProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">ログ</h1>
            <p className="text-xs text-muted-foreground">
              今日の気持ちと記録を残そう。
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">新規ログ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規ログ</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input placeholder="タイトル" />
                <Textarea placeholder="今日の出来事は？" rows={4} />
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleSave}>保存</Button>
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="border-border/60 bg-background/90 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-rose-100 to-amber-100 text-sm font-semibold text-rose-700 shadow-sm dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950 dark:text-emerald-200">
                  {getInitials(post.name)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-sm font-semibold text-foreground">
                      {post.name}
                    </span>
                    <span>{post.handle}</span>
                    <span>•</span>
                    <span>{post.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="h-3.5 w-3.5" />
                      {post.reposts}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        <div className="space-y-1">
          <ToastTitle>保存しました</ToastTitle>
          <ToastDescription>ログを追加しました。</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
