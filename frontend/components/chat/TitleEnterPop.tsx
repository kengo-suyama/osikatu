"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { TitleBadge, type TitleBadgeRarity } from "@/components/titles/TitleBadge";

export function TitleEnterPop({
  open,
  onDone,
  titleText,
  rarity,
  className,
}: {
  open: boolean;
  onDone: () => void;
  titleText: string;
  rarity: TitleBadgeRarity;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    if (reduceMotion) return;
    const t = window.setTimeout(() => onDone(), 800);
    return () => window.clearTimeout(t);
  }, [open, onDone, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-testid="title-enter-pop"
          className={cn(
            "pointer-events-none absolute left-0 right-0 top-12 z-20 mx-auto flex w-full max-w-[430px] justify-center px-4",
            className
          )}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
        >
          <div className="rounded-2xl border bg-background/80 px-3 py-2 shadow-md backdrop-blur-sm">
            <div className="text-[10px] font-semibold text-muted-foreground">
              入室称号
            </div>
            <div className="mt-1">
              <TitleBadge title={titleText} rarity={rarity} />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

