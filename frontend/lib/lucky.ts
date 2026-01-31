import type { LuckyColor, LuckyData } from "@/lib/uiTypes";
import { loadJson, saveJson } from "@/lib/storage";

const COLORS: LuckyColor[] = [
  { name: "ローズピンク", value: "343 82% 60%" },
  { name: "ピーチ", value: "18 94% 73%" },
  { name: "ラベンダー", value: "260 75% 75%" },
  { name: "ミント", value: "160 65% 55%" },
  { name: "スカイ", value: "200 80% 60%" },
];

const ACTIONS = [
  "推しの写真を1枚整理する",
  "推し活ノートを3行だけ書く",
  "グッズの収納を少しだけ整える",
  "配信の切り抜きを1本見る",
  "次の予定をカレンダーに入れる",
];

const ITEMS = [
  "キラキラのステッカー",
  "クリアケース",
  "小さめの香水",
  "パステルカラーのペン",
  "推し色のリボン",
];

function hashSeed(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function pick<T>(items: T[], rand: () => number) {
  return items[Math.floor(rand() * items.length)];
}

export function createLucky(dateKey: string): LuckyData {
  const rand = seededRandom(hashSeed(dateKey));
  return {
    color: pick(COLORS, rand),
    number: Math.floor(rand() * 99) + 1,
    action: pick(ACTIONS, rand),
    item: pick(ITEMS, rand),
  };
}

export function getDailyLucky(date = new Date()): LuckyData {
  const dateKey = date.toISOString().slice(0, 10);
  const storageKey = `osikatu:lucky:${dateKey}`;

  if (typeof window !== "undefined") {
    const stored = loadJson<LuckyData>(storageKey);
    if (stored) return stored;
  }

  const lucky = createLucky(dateKey);
  if (typeof window !== "undefined") {
    saveJson(storageKey, lucky);
  }
  return lucky;
}
