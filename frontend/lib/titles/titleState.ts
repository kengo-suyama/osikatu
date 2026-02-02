import { loadJson, saveJson } from "@/lib/storage";
import type { TitleRarity } from "@/lib/titles/titles_ja_1000_universal";

const STORAGE_KEY = "osikatu:title:today";
const STREAK_KEY = "osikatu:title:streak";
const HISTORY_KEY = "osikatu:title:history";
const STATS_KEY = "osikatu:title:stats";

export type TitleState = {
  dateKey: string;
  completed: boolean;
  titleId: string | null;
  titleText: string | null;
  rarity: TitleRarity | null;
  titleTags: string[] | null;
  inferredTags: string[] | null;
  streakCount: number;
  lastCompletedDate: string | null;
};

export type TitleHistoryItem = {
  dateKey: string;
  titleText: string;
  rarity: TitleRarity;
  tags: string[];
  inferredTags?: string[];
};

export type TitleStats = {
  uniqueTitlesCount: number;
  bestRarityEver: TitleRarity;
  totalEarnedCount: number;
  seenTitleTexts: string[];
  lastEarnedDate: string | null;
};

const parseDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00+09:00`);

const isYesterday = (today: string, last: string) => {
  const t = parseDateKey(today);
  const l = parseDateKey(last);
  const diff = t.getTime() - l.getTime();
  return diff > 0 && diff <= 36 * 60 * 60 * 1000;
};

export const loadTitleState = (dateKey: string): TitleState => {
  const stored = loadJson<TitleState>(STORAGE_KEY);
  const streak = loadJson<{ streakCount: number; lastCompletedDate: string | null }>(STREAK_KEY);
  if (stored && stored.dateKey === dateKey) {
    return {
      ...stored,
      streakCount: streak?.streakCount ?? stored.streakCount,
      lastCompletedDate: streak?.lastCompletedDate ?? stored.lastCompletedDate,
    };
  }
  return {
    dateKey,
    completed: false,
      titleId: null,
      titleText: null,
      rarity: null,
      titleTags: null,
      inferredTags: null,
      streakCount: streak?.streakCount ?? 0,
      lastCompletedDate: streak?.lastCompletedDate ?? null,
    };
};

export const saveTitleState = (state: TitleState) => {
  saveJson(STORAGE_KEY, state);
  saveJson(STREAK_KEY, {
    streakCount: state.streakCount,
    lastCompletedDate: state.lastCompletedDate,
  });
};

export const applyCompletion = (state: TitleState): TitleState => {
  const today = state.dateKey;
  const last = state.lastCompletedDate;
  const nextStreak =
    last && isYesterday(today, last) ? state.streakCount + 1 : 1;
  return {
    ...state,
    completed: true,
    streakCount: nextStreak,
    lastCompletedDate: today,
  };
};

export const getTitleHistory = (): TitleHistoryItem[] => {
  const history = loadJson<TitleHistoryItem[]>(HISTORY_KEY);
  return Array.isArray(history) ? history : [];
};

export const pushTitleHistory = (item: TitleHistoryItem) => {
  const history = getTitleHistory().filter((entry) => entry.dateKey !== item.dateKey);
  history.unshift(item);
  saveJson(HISTORY_KEY, history.slice(0, 7));
};

export const clearTitleHistory = () => {
  saveJson(HISTORY_KEY, []);
};

const rarityOrder: TitleRarity[] = ["common", "rare", "epic", "legendary"];

const getBestRarity = (current: TitleRarity, next: TitleRarity) => {
  return rarityOrder.indexOf(next) > rarityOrder.indexOf(current) ? next : current;
};

const isValidRarity = (value: string): value is TitleRarity =>
  rarityOrder.includes(value as TitleRarity);

const sanitizeTitleStats = (value: TitleStats): TitleStats | null => {
  if (!value || typeof value !== "object") return null;
  const seen = Array.isArray(value.seenTitleTexts)
    ? value.seenTitleTexts.filter((item) => typeof item === "string")
    : [];
  const unique = Array.from(new Set(seen)).slice(0, 2000);
  const best = isValidRarity(value.bestRarityEver) ? value.bestRarityEver : "common";
  const total = Number.isFinite(value.totalEarnedCount) ? Math.max(0, value.totalEarnedCount) : 0;
  const lastDate = typeof value.lastEarnedDate === "string" ? value.lastEarnedDate : null;
  return {
    uniqueTitlesCount: unique.length,
    bestRarityEver: best,
    totalEarnedCount: total,
    seenTitleTexts: unique,
    lastEarnedDate: lastDate,
  };
};

export const getTitleStats = (): TitleStats => {
  const stored = loadJson<TitleStats>(STATS_KEY);
  if (stored) {
    const sanitized = sanitizeTitleStats(stored);
    if (sanitized) return sanitized;
  }
  return {
    uniqueTitlesCount: 0,
    bestRarityEver: "common",
    totalEarnedCount: 0,
    seenTitleTexts: [],
    lastEarnedDate: null,
  };
};

export const updateTitleStatsOnEarn = (item: TitleHistoryItem) => {
  const stats = getTitleStats();
  const seen = new Set(stats.seenTitleTexts);
  if (!seen.has(item.titleText)) {
    seen.add(item.titleText);
    stats.uniqueTitlesCount += 1;
  }
  stats.seenTitleTexts = Array.from(seen).slice(0, 2000);
  stats.bestRarityEver = getBestRarity(stats.bestRarityEver, item.rarity);
  if (stats.lastEarnedDate !== item.dateKey) {
  stats.totalEarnedCount += 1;
  stats.lastEarnedDate = item.dateKey;
  }
  stats.uniqueTitlesCount = stats.seenTitleTexts.length;
  saveJson(STATS_KEY, stats);
};
