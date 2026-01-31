"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import MotionCard from "@/components/feed/MotionCard";
import type { FeedPost } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const getInitials = (name: string) => name.slice(0, 1).toUpperCase();

export default function MotionFeed({ items, className }: { items: FeedPost[]; className?: string }) {
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  return (
    <motion.ul
      initial={hasMounted.current ? false : "hidden"}
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
                  <span className="text-sm font-semibold text-foreground">{item.name}</span>
                  <span>{item.handle}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
                {item.image ? (
                  <div className="h-28 w-full rounded-xl bg-gradient-to-br from-rose-100 via-white to-sky-100" />
                ) : null}
                <p className="text-sm leading-relaxed text-foreground/90">{item.content}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </MotionCard>
        </motion.li>
      ))}
    </motion.ul>
  );
}
