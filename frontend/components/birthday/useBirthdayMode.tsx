"use client";

import { useMemo } from "react";

import {
  formatBirthdayCountdown,
  getDaysUntilNextBirthday,
  getNextBirthdayDate,
} from "@/lib/birthday";
import type { BirthdayMode } from "@/lib/birthdayFx";

export function useBirthdayMode(birthdayISO?: string | null) {
  return useMemo(() => {
    const days = getDaysUntilNextBirthday(birthdayISO ?? null);
    const nextDate = getNextBirthdayDate(birthdayISO ?? null);
    let mode: BirthdayMode = "NORMAL";

    if (days === 0) mode = "BIRTHDAY";
    if (days !== null && days >= 1 && days <= 3) mode = "TEASER";

    return {
      mode,
      days,
      label: formatBirthdayCountdown(days),
      nextDate,
    };
  }, [birthdayISO]);
}
