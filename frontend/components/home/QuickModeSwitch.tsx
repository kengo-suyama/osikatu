"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { circleRepo } from "@/lib/repo/circleRepo";
import { EVENTS } from "@/lib/events";
import { saveString } from "@/lib/storage";

type Mode = "personal" | "circle";
type CircleItem = { id: string; name: string };

const MODE_KEY = "osikatu.quickMode";
const LAST_CIRCLE_KEY = "osikatu.lastCircleId";
const CIRCLE_KEY = "osikatu:circle:selected";

const readLS = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLS = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

export default function QuickModeSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  const [mode, setMode] = useState<Mode>("personal");
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [circleId, setCircleId] = useState<string>("");

  const hasCircles = circles.length > 0;

  useEffect(() => {
    const storedMode = (readLS(MODE_KEY) as Mode | null) ?? "personal";
    setMode(storedMode);

    const storedCircle = readLS(LAST_CIRCLE_KEY) ?? readLS(CIRCLE_KEY);
    if (storedCircle) setCircleId(storedCircle);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await circleRepo.list();
        if (!mounted) return;
        const items = list.map((circle) => ({
          id: String(circle.id),
          name: circle.name ?? "サークル",
        }));
        setCircles(items);

        if (!circleId && items.length > 0) {
          setCircleId(items[0].id);
        }
      } catch {
        if (!mounted) return;
        setCircles([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [circleId]);

  const inferredMode = useMemo(() => {
    if (pathname.startsWith("/circles/")) return "circle";
    return "personal";
  }, [pathname]);

  const goPersonal = () => {
    setMode("personal");
    writeLS(MODE_KEY, "personal");
    router.push("/home");
  };

  const goCircle = (targetCircleId?: string) => {
    const id = (targetCircleId ?? circleId) || circles[0]?.id || "";
    setMode("circle");
    writeLS(MODE_KEY, "circle");
    if (!id) {
      router.push("/circles");
      return;
    }
    writeLS(LAST_CIRCLE_KEY, id);
    saveString(CIRCLE_KEY, id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(EVENTS.CIRCLE_CHANGE, { detail: { circleId: id } })
      );
    }
    router.push(`/circles/${id}`);
  };

  return (
    <div data-testid="quick-mode-switch" className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-xl border border-white/15">
        <button
          data-testid="quick-mode-personal"
          type="button"
          onClick={goPersonal}
          className={`px-3 py-2 text-sm ${
            mode === "personal" || inferredMode === "personal" ? "bg-white/10" : "opacity-70"
          }`}
        >
          個人
        </button>
        <button
          data-testid="quick-mode-circle"
          type="button"
          onClick={() => {
            if (circles.length === 1) {
              goCircle(circles[0].id);
            } else {
              goCircle();
            }
          }}
          className={`px-3 py-2 text-sm ${
            mode === "circle" || inferredMode === "circle" ? "bg-white/10" : "opacity-70"
          }`}
        >
          サークル
        </button>
      </div>

      {circles.length > 1 ? (
        <select
          className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm"
          value={circleId}
          onChange={(event) => {
            const next = event.target.value;
            setCircleId(next);
            writeLS(LAST_CIRCLE_KEY, next);
            saveString(CIRCLE_KEY, next);
          }}
        >
          {circles.map((circle) => (
            <option key={circle.id} value={circle.id}>
              {circle.name}
            </option>
          ))}
        </select>
      ) : null}

      {hasCircles ? (
        <button
          data-testid="quick-mode-go"
          type="button"
          onClick={() => goCircle()}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:opacity-90"
        >
          移動
        </button>
      ) : (
        <button
          data-testid="quick-mode-explore"
          type="button"
          onClick={() => router.push("/circles")}
          className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:opacity-90"
        >
          サークルを探す
        </button>
      )}
    </div>
  );
}
