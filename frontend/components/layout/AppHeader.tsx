"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENTS } from "@/lib/events";
import type { CircleChangeDetail } from "@/lib/events";
import { circleRepo } from "@/lib/repo/circleRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { loadString, saveString } from "@/lib/storage";
import type { CircleDto } from "@/lib/types";
import type { Oshi } from "@/lib/uiTypes";

const STORAGE_KEY = "osikatu:oshi:selected";
const CIRCLE_KEY = "osikatu:circle:selected";

export default function AppHeader() {
  const [list, setList] = useState<Oshi[]>([]);
  const [value, setValue] = useState<string>("");
  const [circles, setCircles] = useState<CircleDto[]>([]);
  const [circleValue, setCircleValue] = useState<string>("");
  const [circleLoading, setCircleLoading] = useState(false);

  useEffect(() => {
    const loadOshis = async () => {
      const oshis = await oshiRepo.getOshis();
      setList(oshis);
      const stored = loadString(STORAGE_KEY);
      const initial = stored ?? (oshis[0]?.id ? String(oshis[0].id) : "");
      setValue(initial);
    };
    loadOshis();

    const handleProfileChange = () => {
      loadOshis();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(EVENTS.OSHI_PROFILE_CHANGE, handleProfileChange);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCircleLoading(true);
    circleRepo
      .list()
      .then((items) => {
        if (!active) return;
        setCircles(items);
        const stored = loadString(CIRCLE_KEY);
        const resolved =
          items.find((circle) => String(circle.id) === String(stored)) ?? items[0] ?? null;
        if (resolved) {
          const nextValue = String(resolved.id);
          setCircleValue(nextValue);
          saveString(CIRCLE_KEY, nextValue);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent<CircleChangeDetail>(EVENTS.CIRCLE_CHANGE, {
                detail: { circleId: nextValue },
              })
            );
          }
        } else {
          setCircleValue("");
        }
      })
      .catch(() => {
        if (!active) return;
        setCircles([]);
        setCircleValue("");
      })
      .finally(() => {
        if (!active) return;
        setCircleLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    saveString(STORAGE_KEY, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENTS.OSHI_CHANGE, { detail: next }));
    }
  };

  const handleCircleChange = (next: string) => {
    setCircleValue(next);
    saveString(CIRCLE_KEY, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<CircleChangeDetail>(EVENTS.CIRCLE_CHANGE, {
          detail: { circleId: next },
        })
      );
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-[430px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">Osikatu</span>
          <span className="rounded-full bg-[hsl(var(--accent))]/15 px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent))]">
            推し活中
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={circleValue} onValueChange={handleCircleChange}>
            <SelectTrigger className="h-9 w-[96px] text-[11px]">
              <SelectValue placeholder={circleLoading ? "読込中" : "サークル"} />
            </SelectTrigger>
            <SelectContent>
              {circles.map((circle) => (
                <SelectItem key={circle.id} value={String(circle.id)}>
                  {circle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={value} onValueChange={handleChange}>
            <SelectTrigger className="h-9 w-[112px] text-[11px]">
              <SelectValue placeholder="推しを選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {list.map((oshi) => (
                <SelectItem key={oshi.id} value={String(oshi.id)}>
                  {oshi.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href="/settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 shadow-sm transition hover:bg-accent/40"
            aria-label="設定へ"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
