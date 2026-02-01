import type { OperationLogDto } from "@/lib/types";
import { logLabel } from "@/lib/ui/logLabels";

export function formatActor(actorUserId?: number | null): string {
  if (!actorUserId) return "だれか";
  return `#${actorUserId}`;
}

export function formatLogTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.replace("T", " ").slice(0, 16);
  return trimmed;
}

function frameName(frameId?: string | null): string | null {
  if (!frameId) return null;
  const map: Record<string, string> = {
    none: "枠なし",
    "simple-line": "シンプル枠",
    "soft-card": "やわらか枠",
    "dot-pop": "ドット枠",
    tape: "マステ枠",
    "double-line": "二重線枠",
    "gradient-edge": "グラデ枠",
    sticker: "ステッカー枠",
    "comic-pop": "コミック枠",
    polaroid_elegant: "ポラロイド（上品）",
    polaroid_pop: "ポラロイド（ポップ）",
    neon_blue: "ネオン（ブルー）",
    neon_purple: "ネオン（パープル）",
    "gold-lux": "ゴールド枠",
    holo: "ホログラム枠",
    sparkle: "キラキラ枠",
    festival_gold: "フェス（金）",
    festival_holo: "フェス（ホロ）",
  };
  return map[frameId] ?? frameId;
}

function metaHint(meta?: Record<string, unknown> | null): string {
  if (!meta) return "";

  const parts: string[] = [];
  if (typeof meta.frameId === "string") {
    const name = frameName(meta.frameId);
    if (name) parts.push(`「${name}」`);
  }

  if (typeof meta.mediaCount === "number") {
    parts.push(`${meta.mediaCount}件`);
  }

  if (typeof meta.enabled === "boolean") {
    parts.push(meta.enabled ? "ON" : "OFF");
  }

  if (typeof meta.specialBg === "boolean") {
    parts.push(meta.specialBg ? "ON" : "OFF");
  }

  return parts.length ? `（${parts.join(" / ")}）` : "";
}

export function logSentence(log: OperationLogDto): string {
  const actor = formatActor(log.actorUserId);
  const hint = metaHint(log.meta);

  switch (log.action) {
    case "chat_message.create":
      return `${actor} がチャットを送信しました${hint}`;
    case "chat_message.delete":
      return `${actor} がチャットを削除しました${hint}`;
    case "join_request.create":
      return `${actor} が参加申請を送りました${hint}`;
    case "join_request.approve":
      return `${actor} が参加申請を承認しました${hint}`;
    case "join_request.reject":
      return `${actor} が参加申請を見送りました${hint}`;
    case "oshi_media.change_frame":
      return `${actor} がフレームを変更しました${hint}`;
    case "circle.ui.theme.update":
      return `${actor} がサークルテーマを変更しました${hint}`;
    case "circle.ui.special_bg.update":
      return `${actor} がフェス背景を切り替えました${hint}`;
    default:
      return `${actor}：${logLabel(log.action)}${hint}`;
  }
}
