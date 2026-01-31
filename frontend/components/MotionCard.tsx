"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MotionCardProps = React.HTMLAttributes<HTMLDivElement> & {
  cardClassName?: string;
};

export default function MotionCard({
  className,
  cardClassName,
  children,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn("will-change-transform", className)}
      {...props}
    >
      <Card className={cn("border-border/60 bg-background/90 shadow-sm", cardClassName)}>
        {children}
      </Card>
    </motion.div>
  );
}
