"use client";

import { useCallback, useEffect, useState } from "react";
import { loadString, saveString } from "@/lib/storage";

const KEY = "osikatu:a11y:reduce-motion";

function getStored(): boolean {
  const v = loadString(KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  // Respect OS preference as default
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}

function apply(enabled: boolean) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.reduceMotion = enabled ? "true" : "false";
  }
}

export function useReduceMotion() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const v = getStored();
    setEnabled(v);
    apply(v);
  }, []);

  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    saveString(KEY, next ? "1" : "0");
    apply(next);
  }, []);

  return { reduceMotion: enabled, setReduceMotion: toggle };
}
