"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import FrameRenderer from "@/components/media/FrameRenderer";
import OshiImageEditorDialog from "@/components/oshi/OshiImageEditorDialog";
import OshiImageUpload from "@/components/oshi/OshiImageUpload";
import TodaySummary from "@/components/widgets/TodaySummary";
import { DEFAULT_ACCENT_COLOR } from "@/lib/color";
import { cn } from "@/lib/utils";
import type { Oshi, SummaryChip } from "@/lib/uiTypes";

export default function OshiAvatarCard({
  oshi,
  summary,
  compact = false,
  onUpdated,
}: {
  oshi: Oshi;
  summary: SummaryChip[];
  compact?: boolean;
  onUpdated?: (oshi: Oshi) => void;
}) {
  const [image, setImage] = useState<string | null>(
    oshi.profile.image_base64 ?? oshi.profile.image_url ?? null
  );
  const [frameId, setFrameId] = useState<string>(
    oshi.profile.image_frame_id ?? "none"
  );
  const hasImage = Boolean(image);
  const chips = compact ? summary.slice(0, 2) : summary;

  useEffect(() => {
    setImage(oshi.profile.image_base64 ?? oshi.profile.image_url ?? null);
    setFrameId(oshi.profile.image_frame_id ?? "none");
  }, [oshi]);

  const badgeText = oshi.profile.role || oshi.profile.charm_point || "推しカラー";

  return (
    <Card
      style={{ "--accent": oshi.profile.accent_color ?? DEFAULT_ACCENT_COLOR } as CSSProperties}
      className={cn(
        "space-y-3 rounded-2xl border shadow-sm",
        compact ? "p-3" : "p-4"
      )}
      data-testid="home-hero-media"
    >
      <FrameRenderer
        frameId={frameId}
        className="aspect-[16/9]"
        contentClassName="overflow-hidden rounded-xl"
        testId="home-hero-frame"
      >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={`${oshi.name}の画像`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-rose-200 via-white to-amber-100 text-rose-500" data-testid="home-hero-empty">
              <ImageIcon className="h-10 w-10" />
              <OshiImageUpload oshiId={oshi.id} label="＋ 画像を追加" onChange={setImage} />
            </div>
          )}
        <div className="absolute right-3 top-3 z-10 flex gap-2" data-testid="home-hero-edit">
          <OshiImageUpload
            oshiId={oshi.id}
            label={hasImage ? "画像変更" : "編集"}
            onChange={setImage}
          />
          {hasImage ? (
            <OshiImageEditorDialog
              oshiId={oshi.id}
              currentFrameId={frameId}
              onFrameSaved={(nextFrameId, updated) => {
                setFrameId(nextFrameId);
                if (updated) {
                  onUpdated?.(updated);
                }
              }}
            />
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <span className="rounded-full bg-[hsl(var(--accent))]/20 px-2 py-1 text-xs font-semibold text-[hsl(var(--accent))]">
            {oshi.name}
          </span>
          <span className="rounded-full border border-white/40 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
            {badgeText}
          </span>
        </div>
      </FrameRenderer>
      <TodaySummary items={chips} />
    </Card>
  );
}
