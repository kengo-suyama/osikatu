import type {
  CelebrationIntensity,
  CelebrationKind,
  CelebrationPrefs,
  CelebrationStyle,
  CelebrationTheme,
  ISODate,
} from "@/lib/types";
import type { Anniversary } from "@/lib/uiTypes";
import { loadJson, loadString, saveJson, saveString } from "@/lib/storage";

export const CELEBRATION_PREFS_KEY = "osikatu:celebration:prefs";
export const USER_BIRTHDAY_KEY = "osikatu:user:birthday";

export const DEFAULT_CELEBRATION_PREFS: CelebrationPrefs = {
  enabled: true,
  style: "sparkle",
  intensity: "high",
  muteAfterShown: true,
};

export const CELEBRATION_STYLE_LABELS: Record<
  CelebrationStyle,
  { label: string; description: string }
> = {
  sparkle: { label: "上品キラキラ", description: "光沢＋少量コンフェッティ" },
  idol: { label: "アイドルライブ", description: "ペンライト＋星粒子" },
  kawaii: { label: "量産型かわいい", description: "ハート＋リボン" },
};

export const CELEBRATION_INTENSITIES: CelebrationIntensity[] = ["low", "mid", "high", "max"];

export const CELEBRATION_INTENSITY_LABELS: Record<CelebrationIntensity, string> = {
  low: "控えめ",
  mid: "ふつう",
  high: "派手",
  max: "最大",
};

const INTENSITY_VALUE: Record<CelebrationIntensity, number> = {
  low: 1,
  mid: 2,
  high: 3,
  max: 4,
};

export const CELEBRATION_DURATION_MS: Record<CelebrationIntensity, number> = {
  low: 1500,
  mid: 2000,
  high: 2400,
  max: 3000,
};

export const CELEBRATION_AFTERGLOW_MS = 1200;

const isCelebrationStyle = (value: unknown): value is CelebrationStyle =>
  value === "sparkle" || value === "idol" || value === "kawaii";

const isCelebrationIntensity = (value: unknown): value is CelebrationIntensity =>
  value === "low" || value === "mid" || value === "high" || value === "max";

export const intensityToValue = (intensity: CelebrationIntensity) =>
  INTENSITY_VALUE[intensity];

export const valueToIntensity = (value: number): CelebrationIntensity => {
  if (value <= 1) return "low";
  if (value === 2) return "mid";
  if (value === 3) return "high";
  return "max";
};

export const normalizeCelebrationPrefs = (
  prefs?: Partial<CelebrationPrefs> | null
): CelebrationPrefs => ({
  enabled:
    typeof prefs?.enabled === "boolean"
      ? prefs.enabled
      : DEFAULT_CELEBRATION_PREFS.enabled,
  style: isCelebrationStyle(prefs?.style) ? prefs.style : DEFAULT_CELEBRATION_PREFS.style,
  intensity: isCelebrationIntensity(prefs?.intensity)
    ? prefs.intensity
    : DEFAULT_CELEBRATION_PREFS.intensity,
  muteAfterShown:
    typeof prefs?.muteAfterShown === "boolean"
      ? prefs.muteAfterShown
      : DEFAULT_CELEBRATION_PREFS.muteAfterShown,
});

export const getCelebrationPrefs = (): CelebrationPrefs => {
  const stored = loadJson<CelebrationPrefs>(CELEBRATION_PREFS_KEY);
  return normalizeCelebrationPrefs(stored ?? null);
};

export const saveCelebrationPrefs = (prefs: CelebrationPrefs) => {
  saveJson(CELEBRATION_PREFS_KEY, prefs);
};

export const getUserBirthday = (): ISODate | null => {
  const stored = loadString(USER_BIRTHDAY_KEY);
  if (!stored) return null;
  return isISODate(stored) ? (stored as ISODate) : null;
};

export const setUserBirthday = (value: ISODate | null) => {
  if (!value) {
    saveString(USER_BIRTHDAY_KEY, "");
    return;
  }
  saveString(USER_BIRTHDAY_KEY, value);
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toISODate = (date: Date): ISODate =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toLocalISODateTime = (date: Date): string => {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hours = pad(Math.floor(abs / 60));
  const minutes = pad(abs % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}${sign}${hours}:${minutes}`;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

const isISODate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseMonthDay = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!month || !day) return null;
    return { month, day };
  }
  if (parts.length === 2) {
    const month = Number(parts[0]);
    const day = Number(parts[1]);
    if (!month || !day) return null;
    return { month, day };
  }
  return null;
};

const isSameMonthDay = (date: Date, month: number, day: number) =>
  date.getMonth() + 1 === month && date.getDate() === day;

const buildOnceKey = (kind: CelebrationKind, date: Date) =>
  `celebration:${kind}:${toISODate(date)}`;

export const hasCelebrationShown = (onceKey: string) => {
  const stored = loadString(onceKey);
  return stored === "true";
};

export const markCelebrationShown = (onceKey: string) => {
  saveString(onceKey, "true");
};

const buildTheme = ({
  kind,
  title,
  subtitle,
  style,
  intensity,
  activeFrom,
  activeTo,
  today,
}: {
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
  style: CelebrationStyle;
  intensity: CelebrationIntensity;
  activeFrom: Date;
  activeTo: Date;
  today: Date;
}): CelebrationTheme => ({
  kind,
  title,
  subtitle,
  style,
  intensity,
  onceKey: buildOnceKey(kind, today),
  activeFrom: toLocalISODateTime(activeFrom),
  activeTo: toLocalISODateTime(activeTo),
});

export type CelebrationContext = {
  today?: Date;
  prefs?: CelebrationPrefs;
  oshiName?: string | null;
  oshiBirthday?: ISODate | null;
  userBirthday?: ISODate | null;
  anniversaries?: Anniversary[];
};

export const getCelebrationTheme = ({
  today = new Date(),
  prefs = DEFAULT_CELEBRATION_PREFS,
  oshiName,
  oshiBirthday,
  userBirthday,
  anniversaries = [],
}: CelebrationContext): CelebrationTheme | null => {
  const normalized = normalizeCelebrationPrefs(prefs);
  const day = startOfDay(today);
  const year = day.getFullYear();

  const monthDayUser = parseMonthDay(userBirthday ?? null);
  if (monthDayUser && isSameMonthDay(day, monthDayUser.month, monthDayUser.day)) {
    return buildTheme({
      kind: "user_birthday",
      title: "Happy Birthday",
      subtitle: "あなたの誕生日をお祝いしよう",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: startOfDay(day),
      activeTo: endOfDay(day),
      today: day,
    });
  }

  const monthDayOshi = parseMonthDay(oshiBirthday ?? null);
  if (monthDayOshi && isSameMonthDay(day, monthDayOshi.month, monthDayOshi.day)) {
    return buildTheme({
      kind: "oshi_birthday",
      title: oshiName ? `${oshiName} Birthday` : "推しの誕生日",
      subtitle: "今日は推しの記念日！",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: startOfDay(day),
      activeTo: endOfDay(day),
      today: day,
    });
  }

  const matchedAnniversary = anniversaries.find((item) => {
    const parsed = parseMonthDay(item.date);
    if (!parsed) return false;
    return isSameMonthDay(day, parsed.month, parsed.day);
  });
  if (matchedAnniversary) {
    return buildTheme({
      kind: "anniversary",
      title: matchedAnniversary.label,
      subtitle: matchedAnniversary.note ?? "特別な記念日",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: startOfDay(day),
      activeTo: endOfDay(day),
      today: day,
    });
  }

  const christmasStart = new Date(year, 11, 24, 0, 0, 0);
  const christmasEnd = new Date(year, 11, 25, 23, 59, 59);
  if (day >= christmasStart && day <= christmasEnd) {
    return buildTheme({
      kind: "christmas",
      title: "Merry Christmas",
      subtitle: "今日は特別な一日",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: christmasStart,
      activeTo: christmasEnd,
      today: day,
    });
  }

  const newYearStart =
    day.getMonth() === 11 ? new Date(year, 11, 31, 0, 0, 0) : new Date(year - 1, 11, 31, 0, 0, 0);
  const newYearEnd =
    day.getMonth() === 11 ? new Date(year + 1, 0, 3, 23, 59, 59) : new Date(year, 0, 3, 23, 59, 59);
  if (day >= newYearStart && day <= newYearEnd) {
    return buildTheme({
      kind: "newyear",
      title: "Happy New Year",
      subtitle: "新しい一年の始まり",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: newYearStart,
      activeTo: newYearEnd,
      today: day,
    });
  }

  const valentineStart = new Date(year, 1, 14, 0, 0, 0);
  const valentineEnd = new Date(year, 1, 14, 23, 59, 59);
  if (day >= valentineStart && day <= valentineEnd) {
    return buildTheme({
      kind: "valentine",
      title: "Happy Valentine",
      subtitle: "チョコと感謝をたっぷり",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: valentineStart,
      activeTo: valentineEnd,
      today: day,
    });
  }

  const whiteDayStart = new Date(year, 2, 14, 0, 0, 0);
  const whiteDayEnd = new Date(year, 2, 14, 23, 59, 59);
  if (day >= whiteDayStart && day <= whiteDayEnd) {
    return buildTheme({
      kind: "whiteday",
      title: "Happy White Day",
      subtitle: "お返しとありがとうを",
      style: normalized.style,
      intensity: normalized.intensity,
      activeFrom: whiteDayStart,
      activeTo: whiteDayEnd,
      today: day,
    });
  }

  return null;
};
