"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { feedItemVariants } from "@/lib/motionConfig";
import { cn } from "@/lib/utils";

export function MotionFeed({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function MotionFeedItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      variants={feedItemVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    />
  );
}
