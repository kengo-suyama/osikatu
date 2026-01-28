"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { modalContentVariants, modalOverlayVariants } from "@/lib/motionConfig";
import { cn } from "@/lib/utils";

type MotionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
};

export default function MotionModal({
  open,
  onOpenChange,
  title,
  children,
}: MotionModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="•Â‚¶‚é"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            variants={modalOverlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "absolute bottom-0 left-0 right-0 mx-auto max-w-screen-sm rounded-t-2xl border bg-background p-4 shadow-lg"
            )}
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {title && <div className="text-base font-semibold">{title}</div>}
            <div className="mt-3 space-y-3">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
