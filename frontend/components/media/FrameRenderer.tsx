"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  frameId?: string | null;
  className?: string;
  contentClassName?: string;
  testId?: string;
  children: ReactNode;
};

/**
 * Generic frame wrapper for image/video content.
 * Uses the global `.media-frame` styles and the `data-frame` attribute.
 */
export default function FrameRenderer({
  frameId,
  className,
  contentClassName,
  testId,
  children,
}: Props) {
  const resolved = frameId && frameId.trim() !== "" ? frameId : "none";

  return (
    <div
      className={cn(
        "media-frame relative rounded-xl",
        className
      )}
      data-frame={resolved}
      data-testid={testId}
    >
      <div className={cn("media-frame__content h-full w-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

