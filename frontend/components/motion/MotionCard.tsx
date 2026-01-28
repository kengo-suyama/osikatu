"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cardMotion, motionTransition } from "@/lib/motionConfig";
import { cn } from "@/lib/utils";

type MotionCardProps = React.HTMLAttributes<HTMLDivElement>;

export default function MotionCard({ className, ...props }: MotionCardProps) {
  return (
    <motion.div
      whileHover={cardMotion.hover}
      whileTap={cardMotion.tap}
      transition={motionTransition}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}
