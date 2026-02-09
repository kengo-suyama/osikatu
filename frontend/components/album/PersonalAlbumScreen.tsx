"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isApiMode } from "@/lib/config";
import { albumRepo } from "@/lib/repo/albumRepo";
import type { AlbumEntry, LogMedia } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

const ALBUM_MEDIA_LIMIT = 8;

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });

const readMedia = async (files: FileList, limit: number) => {
  const targets = Array.from(files)
    .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
    .slice(0, limit);
  const urls = await Promise.all(targets.map((file) => readFileAsDataUrl(file)));
  const items = targets.map((file, index) => ({
    id: makeId("media"),
    type: file.type.startsWith("video/") ? "video" : "image",
    url: urls[index],
    name: file.name,
  })) as LogMedia[];

  const filesById: Record<string, File> = {};
  items.forEach((item, index) => {
    const file = targets[index];
    if (!file) return;
    filesById[item.id] = file;
  });

  return { items, filesById };
};

export default function PersonalAlbumScreen() {
  const [entries, setEntries] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [media, setMedia] = useState<LogMedia[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);

  // Viewer state
  const [viewerEntry, setViewerEntry] = useState<AlbumEntry | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    albumRepo
      .list()
      .then((items) => setEntries(items))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const remaining = ALBUM_MEDIA_LIMIT - media.length;
    if (remaining <= 0) return;
    const { items, filesById } = await readMedia(files, remaining);
    setMedia((prev) => [...prev, ...items]);
    setPendingFiles((prev) => ({ ...prev, ...filesById }));
    event.target.value = "";
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSave = async () => {
    if (!note.trim() && media.length === 0) return;
    if (saving) return;
    setSaving(true);
    try {
      const resolvedDate = date || new Date().toISOString().slice(0, 10);
      const newEntry = isApiMode()
        ? await albumRepo.createApi({
            date: resolvedDate,
            note,
            files: media
              .map((m) => pendingFiles[m.id])
              .filter((f): f is File => Boolean(f)),
          })
        : await albumRepo.createLocal({
            date: resolvedDate,
            note,
            media,
          });
      const next = [newEntry, ...entries];
      setEntries(next);
      albumRepo.persistEntries(next);
      setNote("");
      setMedia([]);
      setPendingFiles({});
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await albumRepo.delete(String(id));
    } catch {
      return;
    }
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    albumRepo.persistEntries(next);
    if (viewerEntry?.id === id) {
      setViewerEntry(null);
    }
  };

  const openViewer = (entry: AlbumEntry, mediaIndex: number = 0) => {
    setViewerEntry(entry);
    setViewerIndex(mediaIndex);
  };

  const viewerMedia = viewerEntry?.media ?? [];
  const viewerCurrent = viewerMedia[viewerIndex] ?? null;
  const viewerCanPrev = viewerIndex > 0;
  const viewerCanNext = viewerIndex < viewerMedia.length - 1;

  return (
    <div className="mx-auto max-w-xl px-4 py-6" data-testid="album-page">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Images className="h-5 w-5" />
            マイアルバム
          </div>
          <div className="text-xs text-muted-foreground">写真・動画を保存できます</div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((prev) => !prev)}
          data-testid="album-upload"
        >
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      {showForm && (
        <div className="mt-4 space-y-3 rounded-2xl border p-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Textarea
            placeholder="思い出メモ"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
            画像/動画を追加（最大{ALBUM_MEDIA_LIMIT}件）
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="hidden"
            />
          </label>

          {media.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {media.map((item) => (
                <div key={item.id} className="relative overflow-hidden rounded-lg border">
                  {item.type === "video" ? (
                    <video src={item.url} className="h-16 w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name ?? "preview"}
                      className="h-16 w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    onClick={() => removeMedia(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "追加中..." : "保存する"}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            読み込み中...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            まだアルバムがありません。上の「追加」ボタンから写真を追加してみましょう。
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border p-3 transition hover:bg-muted/30"
                data-testid="album-item"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">{entry.date}</div>
                    <div className="text-sm font-semibold">
                      {entry.note || "メモなし"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-full border border-red-200 p-1 text-red-500 transition hover:bg-red-50"
                    aria-label="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {entry.media.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {entry.media.slice(0, 6).map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        className="overflow-hidden rounded-lg border"
                        onClick={() => openViewer(entry, idx)}
                      >
                        {item.type === "video" ? (
                          <video
                            src={item.url}
                            className="h-20 w-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt={item.name ?? "アルバム"}
                            className="h-20 w-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                    {entry.media.length > 6 && (
                      <div className="flex h-20 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                        +{entry.media.length - 6}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={viewerEntry !== null} onOpenChange={(open) => { if (!open) setViewerEntry(null); }}>
        <DialogContent className="max-w-[520px]" data-testid="album-viewer">
          <DialogHeader>
            <DialogTitle className="text-base">
              {viewerEntry?.note || "アルバム詳細"}
            </DialogTitle>
          </DialogHeader>
          {viewerCurrent && (
            <div className="relative overflow-hidden rounded-xl">
              {viewerCurrent.type === "video" ? (
                <video
                  src={viewerCurrent.url}
                  controls
                  className="max-h-[60vh] w-full rounded-xl"
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewerCurrent.url}
                  alt={viewerCurrent.name ?? "アルバム"}
                  className="max-h-[60vh] w-full rounded-xl object-contain"
                />
              )}
              {viewerMedia.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewerIndex((prev) => Math.max(0, prev - 1))}
                    disabled={!viewerCanPrev}
                    className={cn(
                      "absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                      !viewerCanPrev && "opacity-40"
                    )}
                    aria-label="前へ"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerIndex((prev) => Math.min(viewerMedia.length - 1, prev + 1))}
                    disabled={!viewerCanNext}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                      !viewerCanNext && "opacity-40"
                    )}
                    aria-label="次へ"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}
          {viewerMedia.length > 1 && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {viewerIndex + 1} / {viewerMedia.length}
            </div>
          )}
          {viewerEntry && (
            <div className="text-xs text-muted-foreground">{viewerEntry.date}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
