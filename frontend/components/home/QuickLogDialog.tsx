"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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

export default function QuickLogDialog() {
  const [open, setOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const handleSave = () => {
    setOpen(false);
    setToastOpen(true);
  };

  return (
    <ToastProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">クイックログを追加</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クイックログ</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="タイトル" />
            <Textarea placeholder="メモ" rows={3} />
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSave} data-testid="quicklog-save">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
