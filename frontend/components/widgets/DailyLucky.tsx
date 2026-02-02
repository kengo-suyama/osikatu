"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getDeviceId } from "@/lib/device";
import { getDailyLucky } from "@/lib/lucky";
import { OSHI_ACTIONS_POOL } from "@/lib/oshiActionsPool";
import { fetchTodayFortune } from "@/lib/repo/fortuneRepo";
import { inferTagsFromAction } from "@/lib/titles/tag_infer";
import { pickTitle } from "@/lib/titles/titlePicker";
import {
  applyCompletion,
  loadTitleState,
  pushTitleHistory,
  updateTitleStatsOnEarn,
  saveTitleState,
  type TitleState,
} from "@/lib/titles/titleState";
import type { FortuneDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const buildDateKey = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seed: number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const pickDailyActions = (deviceId: string, dateKey: string) => {
  if (!OSHI_ACTIONS_POOL.length) return [];
  const seed = hashSeed(`${deviceId}|${dateKey}`);
  const rng = createRng(seed);
  const pool = [...OSHI_ACTIONS_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 1);
};

const isLikelyEnglish = (value: string) => {
  if (!value) return false;
  if (/[ぁ-んァ-ン一-龯]/.test(value)) return false;
  const letters = value.match(/[A-Za-z]/g)?.length ?? 0;
  return letters >= 3;
};

const translateColor = (value: string) => {
  const key = value.toLowerCase();
  const map: Record<string, string> = {
    red: "赤",
    blue: "青",
    green: "緑",
    yellow: "黄色",
    purple: "紫",
    pink: "ピンク",
    orange: "オレンジ",
    black: "黒",
    white: "白",
    gold: "金",
    silver: "銀",
    brown: "茶",
    cyan: "シアン",
  };
  return map[key] ?? value;
};

const translateItem = (value: string) => {
  const key = value.toLowerCase();
  const map: Record<string, string> = {
    keychain: "キーホルダー",
    notebook: "ノート",
    earphones: "イヤホン",
    "phone case": "スマホケース",
    "lip balm": "リップクリーム",
    watch: "腕時計",
    pen: "ペン",
    "sticky notes": "付箋",
    mug: "マグカップ",
    handkerchief: "ハンカチ",
    planner: "手帳",
    coffee: "コーヒー",
    amulet: "お守り",
    "rubber band": "輪ゴム",
    phone: "スマホ",
    card: "カード",
  };
  return map[key] ?? value;
};

const normalizeFortuneToJa = (fortune: FortuneDto) => {
  const message = isLikelyEnglish(fortune.message)
    ? "集中力が高まる日。作業は小さく分けて進めると吉。"
    : fortune.message;
  const goodAction = isLikelyEnglish(fortune.goodAction)
    ? "直感を大事にする"
    : fortune.goodAction;
  const badAction = isLikelyEnglish(fortune.badAction)
    ? "他人の意見を無視しすぎない"
    : fortune.badAction;

  return {
    ...fortune,
    luckyColor: translateColor(fortune.luckyColor),
    luckyItem: translateItem(fortune.luckyItem),
    message,
    goodAction,
    badAction,
  };
};

const loadDoneMap = (dateKey: string) => {
  try {
    if (typeof window === "undefined") return {} as Record<string, boolean>;
    const raw = localStorage.getItem(`osikatu:oshiActions:done:${dateKey}`);
    if (!raw) return {} as Record<string, boolean>;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed ?? {};
  } catch {
    return {} as Record<string, boolean>;
  }
};

const saveDoneMap = (dateKey: string, map: Record<string, boolean>) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(`osikatu:oshiActions:done:${dateKey}`, JSON.stringify(map));
  } catch {
    return;
  }
};

const buildFallbackFortune = (dateKey: string): FortuneDto => {
  const lucky = getDailyLucky(new Date(`${dateKey}T00:00:00+09:00`));
  return {
    date: dateKey,
    luckScore: lucky.number,
    luckyColor: lucky.color.name,
    luckyItem: lucky.item,
    message: "集中力が高まる日。作業は小さく分けて進めると吉。",
    goodAction: lucky.action,
    badAction: "他人の意見を無視しすぎない",
    updatedAt: null,
  };
};

const hashActionSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const rarityLabel: Record<string, string> = {
  common: "★",
  rare: "★★",
  epic: "★★★",
  legendary: "★★★★",
};

const rarityTitle: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function DailyLucky({ compact = false }: { compact?: boolean }) {
  const [fortune, setFortune] = useState<FortuneDto | null>(null);
  const [loading, setLoading] = useState(true);
  const dateKey = useMemo(() => buildDateKey(), []);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const debugTagsEnabled = searchParams?.get("debugTags") === "1";
  const dailyActions = useMemo(
    () => (deviceId ? pickDailyActions(deviceId, dateKey) : []),
    [deviceId, dateKey]
  );
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [titleState, setTitleState] = useState<TitleState>(() => loadTitleState(dateKey));

  const confettiPieces = useMemo(() => {
    if (!showCelebration) return [] as Array<{
      id: number;
      left: number;
      delay: number;
      duration: number;
      size: number;
      rotate: number;
      color: string;
    }>;
    const rarity = titleState.rarity ?? "common";
    const count =
      rarity === "legendary"
        ? 56
        : rarity === "epic"
          ? 42
          : rarity === "rare"
            ? 32
            : 24;
    const colors = ["#fbcfe8", "#fda4af", "#fde68a", "#bae6fd", "#c7d2fe"];
    return Array.from({ length: count }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.2,
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      color: colors[index % colors.length],
    }));
  }, [showCelebration, celebrationKey]);

  useEffect(() => {
    try {
      setDeviceId(getDeviceId());
    } catch {
      setDeviceId("device-unknown");
    }
  }, []);

  useEffect(() => {
    setDoneMap(loadDoneMap(dateKey));
    setTitleState(loadTitleState(dateKey));
  }, [dateKey]);

  useEffect(() => {
    let canceled = false;

    fetchTodayFortune()
      .then((data) => {
        if (!canceled) {
          setFortune(data ?? buildFallbackFortune(dateKey));
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  const doneCount = dailyActions.filter((action) => doneMap[action]).length;
  const localizedFortune = fortune ? normalizeFortuneToJa(fortune) : null;
  const status = loading ? "loading" : fortune ? "ready" : "error";
  const visibleTags = (titleState.titleTags ?? []).slice(0, 3);
  const extraTagCount =
    titleState.titleTags && titleState.titleTags.length > 3
      ? titleState.titleTags.length - 3
      : 0;
  const rarityText = titleState.rarity ? rarityTitle[titleState.rarity] : null;

  return (
    <div
      className={cn("rounded-2xl border bg-card shadow-sm", compact ? "p-3" : "p-4")}
      data-testid="fortune-block"
      data-status={status}
    >
      <div className="text-sm font-semibold text-muted-foreground">今日の運勢</div>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">読み込み中…</p>
      ) : !fortune || !localizedFortune ? (
        <p className="mt-3 text-sm text-muted-foreground">
          運勢を取得できませんでした。時間をおいて再読み込みしてください。
        </p>
      ) : (
        <div
          className={cn("mt-3 space-y-2 text-sm", compact && "mt-2 space-y-1 text-xs")}
          data-testid="fortune-section"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">ラッキーカラー</span>
            <span className="text-muted-foreground" data-testid="fortune-lucky-color">
              {localizedFortune.luckyColor}
            </span>
          </div>
          <div>
            <span className="font-semibold">ラッキーアイテム</span>{" "}
            <span data-testid="fortune-lucky-item">{localizedFortune.luckyItem}</span>
          </div>
          <div>
            <span className="font-semibold">今日のメッセージ</span>
            <p className="text-muted-foreground" data-testid="fortune-message">
              {localizedFortune.message}
            </p>
          </div>
          <div>
            <span className="font-semibold">ラッキー行動</span>{" "}
            <span data-testid="fortune-good-action">{localizedFortune.goodAction}</span>
          </div>
          <div>
            <span className="font-semibold">気をつけること</span>{" "}
            <span data-testid="fortune-bad-action">{localizedFortune.badAction}</span>
          </div>
        </div>
      )}
      <div className={cn("mt-3 text-sm", compact && "mt-2 text-xs")}>
        <Link href="/fortune" className="text-primary underline-offset-4 hover:underline">
          履歴を見る
        </Link>
      </div>
      <div className={cn("mt-4", compact && "mt-3")}>
        <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>推し活アクション（今日）</span>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{dailyActions.length || 1} 完了
          </span>
        </div>
        <div className={cn("mt-2 space-y-2", compact && "mt-1")}>
          {dailyActions.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              今日の推し活アクションを準備中です。
            </div>
          ) : (
            dailyActions.map((action) => (
              <label
                key={action}
                className={cn(
                  "flex items-start gap-2 rounded-xl border border-dashed px-3 py-2 text-sm",
                  compact && "text-xs"
                )}
                data-testid="oshi-action-item"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(doneMap[action])}
                  onChange={(event) => {
                    const wasChecked = Boolean(doneMap[action]);
                    const next = { ...doneMap, [action]: event.target.checked };
                    setDoneMap(next);
                    saveDoneMap(dateKey, next);
                    if (!wasChecked && event.target.checked) {
                      if (!titleState.completed && deviceId) {
                        const tags = inferTagsFromAction(action);
                        const seed = `${deviceId}:${dateKey}:${hashActionSeed(action)}`;
                        const picked = pickTitle({ seed, tags });
                        const nextState = applyCompletion({
                          ...titleState,
                          titleId: picked.entry.id,
                          titleText: picked.entry.title,
                          rarity: picked.rarity,
                          titleTags: picked.entry.tags ?? tags,
                          inferredTags: tags,
                        });
                        setTitleState(nextState);
                        saveTitleState(nextState);
                        const historyItem = {
                          dateKey,
                          titleText: picked.entry.title,
                          rarity: picked.rarity,
                          tags: picked.entry.tags ?? tags,
                          inferredTags: tags,
                        };
                        pushTitleHistory(historyItem);
                        updateTitleStatsOnEarn(historyItem);
                      }
                      setCelebrationKey((prev) => prev + 1);
                      setShowCelebration(true);
                      window.setTimeout(() => setShowCelebration(false), 2800);
                    }
                  }}
                  data-testid="oshi-action-checkbox"
                />
                <span className="text-muted-foreground" data-testid="oshi-action-text">
                  {action}
                </span>
              </label>
            ))
          )}
        </div>
        <div className={cn("mt-3 rounded-xl border border-dashed p-3 text-sm", compact && "text-xs")}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>今日の称号</span>
            {titleState.rarity ? (
              <span>{rarityLabel[titleState.rarity]}</span>
            ) : null}
          </div>
          {titleState.completed && titleState.titleText ? (
            <div className="mt-1">
              <div className="font-semibold">{titleState.titleText}</div>
              <div className="text-xs text-muted-foreground">
                {rarityTitle[titleState.rarity ?? "common"]} · 連続 {titleState.streakCount} 日
              </div>
              {visibleTags.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  {visibleTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                  {extraTagCount > 0 ? (
                    <span className="rounded-full border border-border/60 px-2 py-0.5">
                      +{extraTagCount}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {debugTagsEnabled ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  推定タグ: {titleState.inferredTags?.join(" / ") || "なし"} ·
                  レア度: {rarityText ?? "unknown"}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">未獲得</div>
          )}
          <div className="mt-2 text-[11px]">
            <Link href="/titles" className="text-primary underline-offset-4 hover:underline">
              履歴を見る
            </Link>
          </div>
        </div>
      </div>
      {showCelebration ? (
        <div
          className="oshi-celebration"
          aria-hidden="true"
          data-testid="celebration-overlay"
        >
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="oshi-confetti"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                transform: `rotate(${piece.rotate}deg)`,
                backgroundColor: piece.color,
              }}
            />
          ))}
        </div>
      ) : null}
      <style jsx>{`
        .oshi-celebration {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 50;
          overflow: hidden;
        }
        .oshi-confetti {
          position: absolute;
          top: -10px;
          border-radius: 9999px;
          opacity: 0.9;
          animation-name: oshi-fall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }
        @keyframes oshi-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(110vh) rotate(260deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
