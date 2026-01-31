"use client";

import { Wand2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OshiImageEditorDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full px-3 text-[11px]"
        >
          <Wand2 className="h-3.5 w-3.5" />
          編集
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>画像編集（準備中）</DialogTitle>
          <DialogDescription>
            トリミングや明るさ調整は次のステップで追加予定です。
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
