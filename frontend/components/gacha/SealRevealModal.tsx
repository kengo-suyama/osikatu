"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SealOfuda, type SealPhase } from "@/components/gacha/SealOfuda";

type SealRevealModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

const nextPhase = (phase: SealPhase): SealPhase => {
  if (phase === "idle") return "charge";
  if (phase === "charge") return "crack";
  if (phase === "crack") return "burst";
  return "burst";
};

export function SealRevealModal({
  open,
  onOpenChange,
  className,
}: SealRevealModalProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<SealPhase>("idle");

  useEffect(() => {
    if (!open) setPhase("idle");
  }, [open]);

  const ui = useMemo(() => {
    if (phase === "idle") {
      return {
        title: "封印札ガチャ",
        desc: "詠唱して、封をほどこう。",
        primary: { label: "詠唱する", testid: "gacha-phase-charge" },
      };
    }
    if (phase === "charge") {
      return {
        title: "封印がほどけていく…",
        desc: reduceMotion ? "（簡易表示）" : "光が集まってきた。",
        primary: { label: "破る", testid: "gacha-phase-crack" },
      };
    }
    if (phase === "crack") {
      return {
        title: "あと少し",
        desc: "いま、解き放つ。",
        primary: { label: "開放", testid: "gacha-phase-burst" },
      };
    }
    return {
      title: "開封",
      desc: "ご縁が舞い降りた。",
      primary: { label: "閉じる", testid: "gacha-phase-close" },
    };
  }, [phase, reduceMotion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="gacha-seal-modal"
        className={cn(
          "w-full max-w-[430px] rounded-2xl p-0",
          className
        )}
      >
        <div className="p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>{ui.title}</DialogTitle>
            <DialogDescription>{ui.desc}</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <SealOfuda phase={phase} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              data-testid="gacha-seal-cancel"
            >
              閉じる
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (phase === "burst") {
                  onOpenChange(false);
                  return;
                }
                setPhase((p) => nextPhase(p));
              }}
              data-testid={ui.primary.testid}
            >
              {ui.primary.label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

