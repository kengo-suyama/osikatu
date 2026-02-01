export type FrameTier = "free" | "premium" | "plus";

export type FrameDef = {
  id: string;
  label: string;
  tier: FrameTier;
  description?: string;
};

export const FRAMES: FrameDef[] = [
  { id: "none", label: "なし", tier: "free" },

  { id: "simple-line", label: "シンプル枠", tier: "free" },
  { id: "soft-card", label: "やわらか枠", tier: "free" },
  { id: "dot-pop", label: "ドット枠", tier: "free" },
  { id: "tape", label: "マステ枠", tier: "free" },

  { id: "double-line", label: "二重線枠", tier: "premium" },
  { id: "gradient-edge", label: "グラデ枠", tier: "premium" },
  { id: "sticker", label: "ステッカー枠", tier: "premium" },
  { id: "comic-pop", label: "コミック枠", tier: "premium" },
  { id: "polaroid_elegant", label: "ポラロイド（上品）", tier: "premium" },
  { id: "polaroid_pop", label: "ポラロイド（ポップ）", tier: "premium" },
  { id: "neon_blue", label: "ネオン（ブルー）", tier: "premium" },
  { id: "neon_purple", label: "ネオン（パープル）", tier: "premium" },

  { id: "gold-lux", label: "ゴールド枠", tier: "plus" },
  { id: "holo", label: "ホログラム枠", tier: "plus" },
  { id: "sparkle", label: "キラキラ枠", tier: "plus" },
  { id: "festival_gold", label: "フェス（金）", tier: "plus" },
  { id: "festival_holo", label: "フェス（ホロ）", tier: "plus" },
];

export const getFrameById = (frameId?: string | null): FrameDef => {
  if (!frameId) return FRAMES[0];
  return FRAMES.find((frame) => frame.id === frameId) ?? FRAMES[0];
};

export const getFramesForPlan = (plan: "free" | "premium" | "plus") => {
  if (plan === "plus") return FRAMES;
  if (plan === "premium") {
    return FRAMES.filter((frame) => frame.tier !== "plus");
  }
  return FRAMES.filter((frame) => frame.tier === "free");
};

export const canUseFrame = (
  plan: "free" | "premium" | "plus",
  isTrial: boolean,
  frameId: string
) => {
  const effectivePlan = plan === "free" && isTrial ? "premium" : plan;
  const frame = getFrameById(frameId);
  if (frame.id === "none") return true;
  if (frame.tier === "free") return true;
  if (frame.tier === "premium") return effectivePlan !== "free";
  return effectivePlan === "plus";
};

export const isFrameLocked = (
  plan: "free" | "premium" | "plus",
  isTrial: boolean,
  frameId: string
) => !canUseFrame(plan, isTrial, frameId);