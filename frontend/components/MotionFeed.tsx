"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";

import MotionCard from "@/components/MotionCard";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  name: string;
  handle: string;
  time: string;
  content: string;
  tags?: string[];
  badge?: string;
  likes: number;
  comments: number;
  reposts: number;
};

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const getInitials = (name: string) => name.slice(0, 1).toUpperCase();

export default function MotionFeed({
  items,
  className,
}: {
  items: FeedItem[];
  className?: string;
}) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className={cn("space-y-3", className)}
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          <MotionCard cardClassName="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 via-rose-100 to-amber-100 text-sm font-semibold text-rose-700 shadow-sm dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950 dark:text-emerald-200">
                {getInitials(item.name)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                  <span>{item.handle}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {item.content}
                </p>
                {item.tags?.length ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {item.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {item.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 className="h-3.5 w-3.5" />
                    {item.reposts}
                  </span>
                </div>
              </div>
            </div>
          </MotionCard>
        </motion.li>
      ))}
    </motion.ul>
  );
}
