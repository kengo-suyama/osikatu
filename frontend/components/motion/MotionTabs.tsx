"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motionTransition } from "@/lib/motionConfig";

type TabItem = {
  value: string;
  label: string;
};

type MotionTabsProps = {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  indicatorId?: string;
};

export default function MotionTabs({
  tabs,
  value,
  onValueChange,
  children,
  className,
  indicatorId = "tab-indicator",
}: MotionTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className="relative grid w-full grid-cols-2">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="relative">
            {value === tab.value ? (
              <motion.span
                layoutId={indicatorId}
                transition={motionTransition}
                className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-primary"
              />
            ) : null}
            <span className="relative z-10">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
