"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type TabOption = {
  value: string;
  label: string;
};

type MotionTabsProps = {
  tabs: TabOption[];
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
};

export default function MotionTabs({
  tabs,
  value,
  onValueChange,
  children,
}: MotionTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="relative grid w-full grid-cols-2 bg-muted/70">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative z-10 flex-1 rounded-md data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            )}
          >
            {value === tab.value ? (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                transition={{ duration: 0.25 }}
              />
            ) : null}
            <span className="relative z-10 text-sm">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
