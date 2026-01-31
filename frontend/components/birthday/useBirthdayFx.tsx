"use client";

import { useEffect, useState } from "react";

import {
  getBirthdayFxEnabled,
  getBirthdayFxTheme,
  type BirthdayFxTheme,
  BIRTHDAY_FX_ENABLED_KEY,
  BIRTHDAY_FX_THEME_KEY,
} from "@/lib/birthdayFx";
import { EVENTS } from "@/lib/events";

export function useBirthdayFx() {
  const [enabled, setEnabled] = useState(getBirthdayFxEnabled());
  const [theme, setTheme] = useState<BirthdayFxTheme>(getBirthdayFxTheme());

  useEffect(() => {
    const handleChange = () => {
      setEnabled(getBirthdayFxEnabled());
      setTheme(getBirthdayFxTheme());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === BIRTHDAY_FX_ENABLED_KEY || event.key === BIRTHDAY_FX_THEME_KEY) {
        handleChange();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.BIRTHDAY_FX_CHANGE, handleChange);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.BIRTHDAY_FX_CHANGE, handleChange);
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, []);

  return { enabled, theme };
}
