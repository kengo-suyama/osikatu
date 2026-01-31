"use client";

import { HelpCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HOW_TO_USE } from "@/lib/howto";

export default function HowToUseDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          使い方
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>使い方ガイド</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{HOW_TO_USE}</pre>
      </DialogContent>
    </Dialog>
  );
}
