"use client";

import React from "react";
import type { OshiMediaItem } from "@/lib/repo/oshiMediaRepo";

type Props = {
  item: OshiMediaItem;
  variant?: "primary" | "thumb";
  showVideoControls?: boolean;
  preferThumbAsPoster?: boolean;
  className?: string;
};

export default function OshiMediaViewer({
  item,
  variant = "thumb",
  showVideoControls = true,
  preferThumbAsPoster = true,
  className,
}: Props) {
  const frameId = item.frameId || "none";
  const poster = preferThumbAsPoster ? item.thumbUrl ?? undefined : undefined;
  const height = variant === "thumb" ? 120 : undefined;

  return (
    <div className={className}>
      <div
        className="media-frame oshiFrame relative overflow-hidden rounded-xl border bg-muted/40"
        data-frame={frameId}
      >
        <div className="media-frame__content h-full w-full">
          {item.mediaType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt="oshi media"
              loading={variant === "thumb" ? "lazy" : "eager"}
              style={{
                width: "100%",
                height,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <video
              src={item.url}
              poster={poster}
              controls={showVideoControls}
              preload={variant === "thumb" ? "metadata" : "auto"}
              style={{
                width: "100%",
                height,
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
