"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { circleMediaRepo } from "@/lib/repo/circleMediaRepo";
import { circleRepo } from "@/lib/repo/circleRepo";
import type { CircleMediaDto } from "@/lib/types";

export default function CircleAlbumScreen({ circleId }: { circleId: number }) {
  const [items, setItems] = useState<CircleMediaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const current = items[currentIndex] ?? null;

  const fetchList = () => {
    setLoading(true);
    setError(null);
    circleRepo
      .get(circleId)
      .then((circle) => {
        if (!circle) {
          setError("このサークルは表示できません");
          return;
        }
        return circleMediaRepo.list(circleId);
      })
      .then((data) => {
        if (!data) return;
        setItems(data.items ?? []);
      })
      .catch(() => {
        setError("アルバムの取得に失敗しました");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < items.length - 1;

  const openViewer = (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
    setDirection(0);
  };

  const handlePrev = () => {
    if (!canPrev) return;
    setDirection(-1);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!canNext) return;
    setDirection(1);
    setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
  };

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const created = await circleMediaRepo.create(circleId, {
        file,
        caption: caption.trim() ? caption.trim() : undefined,
      });
      setItems((prev) => [created, ...prev]);
      setCaption("");
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const viewerContent = useMemo(() => {
    if (!current) return null;
    if (current.type === "video") {
      return (
        <video
          src={current.url}
          controls
          className="max-h-[60vh] w-full rounded-xl"
        />
      );
    }
    return (
      <img
        src={current.url}
        alt="album"
        className="max-h-[60vh] w-full rounded-xl object-contain"
      />
    );
  }, [current]);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div>
        <div className="text-lg font-semibold">サークルアルバム</div>
        <div className="text-xs text-muted-foreground">画像・動画を保存できます</div>
      </div>

      <Card className="rounded-2xl border p-4 shadow-sm">
        <div className="space-y-2">
          <Textarea
            placeholder="メモ（任意）"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
          <label
            className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground"
            data-testid="album-upload"
          >
            画像/動画を追加
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {uploading ? (
            <div className="text-xs text-muted-foreground">アップロード中...</div>
          ) : null}
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
          読み込み中...
        </Card>
      ) : error ? (
        <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
          {error}
        </Card>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border p-4 text-sm text-muted-foreground">
          まだアルバムがありません。
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="overflow-hidden rounded-xl border border-border/60"
              onClick={() => openViewer(index)}
              data-testid="album-item"
            >
              {item.type === "video" ? (
                <video src={item.url} className="h-24 w-full object-cover" muted />
              ) : (
                <img src={item.url} alt="album" className="h-24 w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      <div>
        <Link href={`/circles/${circleId}`} className="text-sm underline">
          サークルHomeへ戻る
        </Link>
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>アルバム詳細</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-hidden rounded-xl">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {current ? (
                <motion.div
                  key={current.id}
                  custom={direction}
                  initial={{
                    rotateY: direction >= 0 ? -90 : 90,
                    opacity: 0,
                  }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{
                    rotateY: direction >= 0 ? 90 : -90,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: direction >= 0 ? "left center" : "right center" }}
                >
                  {viewerContent}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          {current?.caption ? (
            <div className="text-xs text-muted-foreground">{current.caption}</div>
          ) : null}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={handlePrev}
              disabled={!canPrev}
              data-testid="album-page-prev"
            >
              前へ
            </Button>
            <Button
              variant="secondary"
              onClick={handleNext}
              disabled={!canNext}
              data-testid="album-page-next"
            >
              次へ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
