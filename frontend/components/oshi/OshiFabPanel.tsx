"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, User } from "lucide-react";

import BirthdayHero from "@/components/birthday/BirthdayHero";
import OshiProfileAccordion from "@/components/oshi/OshiProfileAccordion";
import OshiProfileForm from "@/components/oshi/OshiProfileForm";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_ACCENT_COLOR } from "@/lib/color";
import type { Oshi } from "@/lib/uiTypes";

export default function OshiFabPanel({
  oshi,
  onUpdated,
}: {
  oshi: Oshi | null;
  onUpdated?: (oshi: Oshi) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("view");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const blockClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    didDrag: boolean;
  } | null>(null);

  const size = 48;
  const margin = 16;
  const bottomOffset = 80;
  const positionKey = "osikatu:fab:position";

  const clampPosition = useCallback(
    (x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const maxX = Math.max(margin, window.innerWidth - size - margin);
    const maxY = Math.max(margin, window.innerHeight - size - bottomOffset);
    return {
      x: Math.min(maxX, Math.max(margin, x)),
      y: Math.min(maxY, Math.max(margin, y)),
    };
    },
    [margin, size]
  );

  const readStoredPosition = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(positionKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x?: number; y?: number };
      if (typeof parsed?.x !== "number" || typeof parsed?.y !== "number") return null;
      return clampPosition(parsed.x, parsed.y);
    } catch {
      return null;
    }
  }, [clampPosition, positionKey]);

  const savePosition = useCallback(
    (next: { x: number; y: number }) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(positionKey, JSON.stringify(next));
    },
    [positionKey]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPosition((prev) => {
      if (prev) return clampPosition(prev.x, prev.y);
      const stored = readStoredPosition();
      if (stored) return stored;
      const initial = {
        x: window.innerWidth - size - margin,
        y: window.innerHeight - size - bottomOffset,
      };
      return clampPosition(initial.x, initial.y);
    });

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const next = clampPosition(prev.x, prev.y);
        savePosition(next);
        return next;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [bottomOffset, clampPosition, margin, readStoredPosition, savePosition, size]);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          if (blockClickRef.current) {
            blockClickRef.current = false;
            return;
          }
          setOpen(true);
        }}
        onPointerDown={(event) => {
          if (typeof window === "undefined") return;
          const origin =
            position ??
            clampPosition(
              window.innerWidth - size - margin,
              window.innerHeight - size - bottomOffset
            );
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: origin.x,
            originY: origin.y,
            didDrag: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const state = dragRef.current;
          if (!state || state.pointerId !== event.pointerId) return;
          const dx = event.clientX - state.startX;
          const dy = event.clientY - state.startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            state.didDrag = true;
          }
          const next = clampPosition(state.originX + dx, state.originY + dy);
          setPosition(next);
        }}
        onPointerUp={(event) => {
          const state = dragRef.current;
          if (!state || state.pointerId !== event.pointerId) return;
          dragRef.current = null;
          blockClickRef.current = state.didDrag;
          if (state.didDrag && position) {
            savePosition(position);
          }
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          const state = dragRef.current;
          if (!state || state.pointerId !== event.pointerId) return;
          dragRef.current = null;
          blockClickRef.current = state.didDrag;
          if (state.didDrag && position) {
            savePosition(position);
          }
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-white shadow-lg"
        style={
          position
            ? {
                left: position.x,
                top: position.y,
                right: "auto",
                bottom: "auto",
                touchAction: "none",
              }
            : { touchAction: "none" }
        }
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        aria-label="プロフィールを開く"
        data-testid="fab-oshi-profile"
      >
        <User className="h-5 w-5" />
      </motion.button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>推しプロフィール</SheetTitle>
          </SheetHeader>

          {oshi ? (
            <div className="space-y-4">
              <BirthdayHero
                oshiName={oshi.name}
                nickname={oshi.profile.nickname ?? ""}
                birthdayISO={oshi.profile.birthday ?? null}
                accentColor={oshi.profile.accent_color ?? DEFAULT_ACCENT_COLOR}
                compact
              />

              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="view">表示</TabsTrigger>
                  <TabsTrigger value="edit">編集</TabsTrigger>
                </TabsList>
              </Tabs>

              {tab === "view" ? (
                <OshiProfileAccordion oshi={oshi} />
              ) : (
                <OshiProfileForm
                  oshi={oshi}
                  onSaved={(updated) => {
                    onUpdated?.(updated);
                    setTab("view");
                  }}
                />
              )}

              {tab === "view" ? (
                <Button variant="secondary" className="w-full" onClick={() => setTab("edit")}>
                  <Pencil className="mr-2 h-4 w-4" />
                  プロフィールを編集
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold">推しが未選択です</div>
              <div className="text-xs text-muted-foreground">
                推しを選択するとプロフィール編集が使えます。
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
