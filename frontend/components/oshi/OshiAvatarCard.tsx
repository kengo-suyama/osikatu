"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
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
}: {
  oshi: Oshi;
  summary: SummaryChip[];
  compact?: boolean;
}) {
  const [image, setImage] = useState<string | null>(
    oshi.profile.image_base64 ?? oshi.profile.image_url ?? null
  );
  const chips = compact ? summary.slice(0, 2) : summary;

  useEffect(() => {
    setImage(oshi.profile.image_base64 ?? oshi.profile.image_url ?? null);
  }, [oshi]);

  const badgeText = oshi.profile.role || oshi.profile.charm_point || "推しカラー";

  return (
    <Card
      style={{ "--accent": oshi.profile.accent_color ?? DEFAULT_ACCENT_COLOR } as CSSProperties}
      className={cn(
        "space-y-3 rounded-2xl border shadow-sm",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted/40">
        {image ? (
          <img src={image} alt={`${oshi.name}の画像`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-200 via-white to-amber-100 text-rose-500">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <OshiImageUpload oshiId={oshi.id} onChange={setImage} />
          <OshiImageEditorDialog />
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rounded-full bg-[hsl(var(--accent))]/20 px-2 py-1 text-xs font-semibold text-[hsl(var(--accent))]">
            {oshi.name}
          </span>
          <span className="rounded-full border border-white/40 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
            {badgeText}
          </span>
        </div>
      </div>
      <TodaySummary items={chips} />
    </Card>
  );
}
