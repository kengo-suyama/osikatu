"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const APP_NAME = "Osikatu";
const APP_URL = "https://osikatu.com";
const DEFAULT_HASHTAGS = ["#推し活", "#Osikatu", "#拡散希望"];

function buildTemplate(customMessage: string): string {
  const lines: string[] = [];
  if (customMessage.trim()) {
    lines.push(customMessage.trim());
    lines.push("");
  }
  lines.push(`${APP_NAME} - 推し活を記録して育てるアプリ`);
  lines.push(APP_URL);
  lines.push("");
  lines.push(DEFAULT_HASHTAGS.join(" "));
  return lines.join("\n");
}

export default function SharePage() {
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const template = buildTemplate(customMessage);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = template;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6" data-testid="share-page">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Share2 className="h-5 w-5" />
        シェア
      </div>
      <div className="text-xs text-muted-foreground">
        定型文を生成してSNSにシェアできます。
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-3">
          <Textarea
            placeholder="ひとことメッセージ（任意）"
            rows={2}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />

          <div
            className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm"
            data-testid="share-template"
          >
            {template}
          </div>

          <Button
            onClick={handleCopy}
            className="w-full"
            data-testid="share-copy"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                テンプレートをコピー
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
