const toStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function parseBirthdayISO(iso?: string | null): Date | null {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((value) => Number(value));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function getNextBirthdayDate(
  iso?: string | null,
  from = new Date()
): Date | null {
  const birthday = parseBirthdayISO(iso);
  if (!birthday) return null;
  const base = toStartOfDay(from);
  const next = new Date(base.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (next < base) {
    next.setFullYear(base.getFullYear() + 1);
  }
  return next;
}

export function getDaysUntilNextBirthday(
  iso?: string | null,
  from = new Date()
): number | null {
  const next = getNextBirthdayDate(iso, from);
  if (!next) return null;
  const base = toStartOfDay(from);
  const diff = next.getTime() - base.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function formatBirthdayCountdown(days: number | null): string {
  if (days === null) return "未設定";
  if (days === 0) return "今日が誕生日！";
  return `あと${days}日`;
}
