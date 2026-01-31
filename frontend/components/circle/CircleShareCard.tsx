"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { circleRepo } from "@/lib/repo/circleRepo";
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
  const [circle, setCircle] = useState<CircleDto | null>(null);
  const [invite, setInvite] = useState<InviteDto | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("personal");

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

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyText(text);
    setCopyState(ok ? key : null);
    setError(ok ? null : "コピーに失敗しました");
    setTimeout(() => setCopyState(null), 1500);
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
              onClick={() => handleCopy(inviteCode, "code")}
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
                tweetText
              )}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            disabled={!inviteCode}
          >
            X で共有
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCopy(tweetText, "instagram")}
            disabled={!inviteCode}
          >
            {copyState === "instagram" ? "Instagram用コピー済み" : "Instagram用コピー"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCopy(tweetText, "line")}
            disabled={!inviteCode}
            className={cn("md:col-span-2")}
          >
            {copyState === "line" ? "LINE/Discord用コピー済み" : "LINE / Discord 用コピー"}
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
          テンプレ文はアプリが管理します。編集はできません。
        </div>
      </div>
    </Card>
  );
}
