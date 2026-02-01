"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/events";
import { circleRepo } from "@/lib/repo/circleRepo";
import { eventsRepo } from "@/lib/repo/eventsRepo";
import { inviteRepo } from "@/lib/repo/inviteRepo";
import type { CircleDto, InviteDto } from "@/lib/types";
import { cn } from "@/lib/utils";

type CircleShareCardProps = {
  circleId: number;
};

const APP_URL = "https://osikatu.app";

const templateVariants = [
  {
    id: "personal",
    label: "個人向け",
    build: (oshiLabel: string, code: string) =>
      `推し活用にサークル管理アプリ使い始めた🌸 遠征・入金・出欠が全部まとまって助かる…\n\n推し：${oshiLabel}\n招待コード：${code}\n\n${APP_URL}\n#推し活 #オタ活`,
  },
  {
    id: "expedition",
    label: "遠征前",
    build: (_oshiLabel: string, code: string) =>
      `遠征班用にサークル作りました✈️ 入金・出欠の管理が一瞬で終わる…\n\n初参加は7日間お試しOK◎\n招待コード：${code}\n\n${APP_URL}\n#遠征 #推し活`,
  },
  {
    id: "owner",
    label: "運営者向け",
    build: (_oshiLabel: string, code: string) =>
      `サークル運営が楽になるアプリ作りました🌸 未確認・未払いが一目で分かるのが最高。\n\n承認制で安心して使えます◎\n招待コード：${code}\n\n${APP_URL}\n#サークル運営 #推し活`,
  },
  {
    id: "instagram_short",
    label: "IG短文",
    build: (oshiLabel: string, code: string) =>
      `推し活の遠征情報まとめてるよ🚄✨「${oshiLabel}」参加どうぞ！\n招待コード：${code}\n${APP_URL}\n#推し活 #遠征`,
  },
  {
    id: "instagram_long",
    label: "IG長文",
    build: (oshiLabel: string, code: string) =>
      `【参加者募集】${oshiLabel}\n遠征の予定/持ち物/現地情報を共有してます！\n招待コード：${code}\n参加URL：${APP_URL}\n#推し活 #遠征 #オタ活`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    build: (oshiLabel: string, code: string) =>
      `遠征・現地情報を共有する推し活サークル「${oshiLabel}」\n招待コード：${code}\n${APP_URL}\n#推し活 #遠征 #オタ活`,
  },
];

const copyText = async (text: string) => {
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
};

export default function CircleShareCard({ circleId }: CircleShareCardProps) {
  const pathname = usePathname();
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [invite, setInvite] = useState<InviteDto | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("personal");
  const [templateText, setTemplateText] = useState("");
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    circleRepo
      .get(circleId)
      .then((data) => setCircle(data))
      .catch(() => setCircle(null));

    inviteRepo
      .getInvite(circleId)
      .then((data) => {
        setInvite(data);
        if (!data) {
          setError("招待コードを取得できませんでした");
        }
      })
      .catch(() => {
        setInvite(null);
        setError("招待コードを取得できませんでした");
      });
  }, [circleId]);

  const inviteCode = invite?.code ?? "";
  const oshiLabel = circle?.oshiLabel ?? circle?.oshiTag ?? "推し";

  const selectedTemplate = useMemo(
    () => templateVariants.find((item) => item.id === templateId) ?? templateVariants[0],
    [templateId]
  );
  const tweetText = useMemo(
    () => selectedTemplate.build(oshiLabel, inviteCode),
    [selectedTemplate, oshiLabel, inviteCode]
  );

  useEffect(() => {
    if (!isEdited) {
      setTemplateText(tweetText);
    }
  }, [tweetText, isEdited]);

  const isMobile = () => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  const openDeepLink = (scheme: string, fallback: string) => {
    if (isMobile()) {
      window.location.href = scheme;
      setTimeout(() => {
        window.open(fallback, "_blank", "noopener,noreferrer");
      }, 500);
      return;
    }
    window.open(fallback, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async (
    text: string,
    key: string,
    eventName?: AnalyticsEventName
  ): Promise<boolean> => {
    const ok = await copyText(text);
    setCopyState(ok ? key : null);
    setError(ok ? null : "コピーに失敗しました");
    setTimeout(() => setCopyState(null), 1500);
    if (ok && eventName) {
      eventsRepo.track(eventName, pathname, circleId);
    }
    return ok;
  };

  return (
    <Card className="rounded-2xl border p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Share2 className="h-4 w-4" />
          サークルを共有
        </div>

        <div className="rounded-xl border border-border/60 p-3">
          <div className="text-xs text-muted-foreground">招待コード</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="text-lg font-semibold tracking-widest">
              {inviteCode || "取得中..."}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(inviteCode, "code", ANALYTICS_EVENTS.INVITE_CODE_COPY)}
              disabled={!inviteCode}
            >
              <Copy className="mr-1 h-4 w-4" />
              {copyState === "code" ? "コピー済み" : "コピー"}
            </Button>
          </div>
          {error ? <div className="mt-1 text-xs text-red-500">{error}</div> : null}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (!inviteCode) return;
              const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                templateText
              )}`;
              window.open(url, "_blank", "noopener,noreferrer");
              eventsRepo.track(ANALYTICS_EVENTS.SHARE_X_CLICK, pathname, circleId);
            }}
            disabled={!inviteCode}
          >
            X で共有
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCopy(templateText, "instagram", ANALYTICS_EVENTS.SHARE_COPY_LINK_CLICK)}
            disabled={!inviteCode}
          >
            {copyState === "instagram" ? "Instagram用コピー済み" : "Instagram用コピー"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCopy(templateText, "line", ANALYTICS_EVENTS.SHARE_LINE_CLICK)}
            disabled={!inviteCode}
            className={cn("md:col-span-2")}
          >
            {copyState === "line" ? "LINE/Discord用コピー済み" : "LINE / Discord 用コピー"}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!inviteCode) return;
              const ok = await handleCopy(templateText, "instagram_open");
              if (ok) {
                eventsRepo.track(
                  ANALYTICS_EVENTS.SHARE_INSTAGRAM_CLICK,
                  pathname,
                  circleId,
                  {
                    provider: "instagram",
                    mode: "copy_then_open",
                  }
                );
                openDeepLink("instagram://app", "https://www.instagram.com/");
              }
            }}
            disabled={!inviteCode}
          >
            Instagram を開く
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!inviteCode) return;
              const ok = await handleCopy(templateText, "tiktok_open");
              if (ok) {
                eventsRepo.track(
                  ANALYTICS_EVENTS.SHARE_TIKTOK_CLICK,
                  pathname,
                  circleId,
                  {
                    provider: "tiktok",
                    mode: "copy_then_open",
                  }
                );
                openDeepLink("tiktok://", "https://www.tiktok.com/");
              }
            }}
            disabled={!inviteCode}
            className={cn("md:col-span-2")}
          >
            TikTok を開く
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">テンプレを選ぶ</div>
          <div className="flex flex-wrap gap-2">
            {templateVariants.map((variant) => (
              <Button
                key={variant.id}
                size="sm"
                variant={templateId === variant.id ? "default" : "secondary"}
                onClick={() => setTemplateId(variant.id)}
              >
                {variant.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          テンプレ文は編集できます。個人情報は書かないでください。
        </div>

        <textarea
          className="min-h-[140px] w-full rounded-xl border bg-background px-3 py-2 text-xs leading-relaxed"
          value={templateText}
          onChange={(event) => {
            setTemplateText(event.target.value);
            setIsEdited(true);
          }}
        />
      </div>
    </Card>
  );
}
