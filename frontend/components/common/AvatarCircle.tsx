"use client";

import { cn } from "@/lib/utils";

type AvatarCircleProps = {
  src?: string | null;
  nickname?: string | null;
  size?: number;
  className?: string;
};

export default function AvatarCircle({
  src,
  nickname,
  size = 32,
  className,
}: AvatarCircleProps) {
  const initial = nickname?.trim().charAt(0) || "?";

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={nickname ?? "avatar"}
    >
      {src ? (
        <img src={src} alt={nickname ?? "avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
