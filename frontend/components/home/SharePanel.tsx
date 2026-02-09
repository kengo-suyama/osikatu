"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n";
import { pointsRepo } from "@/lib/repo/pointsRepo";

const APP_URL = "https://osikatu.app";

type Platform = {
  id: string;
  label: string;
  openUrl?: (text: string) => string;
};

const PLATFORMS: Platform[] = [
  {
    id: "x",
    label: "X",
    openUrl: (text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  {
    id: "line",
    label: "LINE",
    openUrl: (text) =>
      `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(text)}`,
  },
];

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

export default function SharePanel() {
  const { locale } = useLocale();
  const [feedback, setFeedback] = useState<string | null>(null);

  const templateText = t("share.template", locale);

  const handleShare = async (platform: Platform) => {
    const ok = await copyToClipboard(templateText);
    if (!ok) return;

    setFeedback(t("share.copied", locale));
    setTimeout(() => setFeedback(null), 2000);

    // Award daily share points
    void pointsRepo.awardShare();

    // Open external URL if available
    if (platform.openUrl) {
      window.open(platform.openUrl(templateText), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="rounded-2xl border p-4 shadow-sm" data-testid="share-panel">
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold">{t("share.title", locale)}</div>
          <div className="text-xs text-muted-foreground">
            {t("share.description", locale)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={() => void handleShare(p)}
              data-testid={`share-btn-${p.id}`}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {feedback ? (
          <div className="text-xs text-emerald-600" data-testid="share-feedback">
            {feedback}
          </div>
        ) : null}

        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {templateText}
        </div>
      </div>
    </Card>
  );
}
