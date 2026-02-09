"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
  Minimize2,
  Trash2,
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
import { ApiRequestError } from "@/lib/repo/http";
import type { AlbumEntry, LogMedia } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const ALBUM_MEDIA_LIMIT = 8;
const ALBUM_MEDIA_HELP =
  "対応形式: jpg/jpeg/png/webp/mp4 / 上限: 10MB / 最大8件（動画はPlus/Premiumのみ）";

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

export default function AlbumModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [entries, setEntries] = useState<AlbumEntry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [media, setMedia] = useState<LogMedia[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [index, setIndex] = useState(0);
  const [fullView, setFullView] = useState(false);
  const [savedEntry, setSavedEntry] = useState<AlbumEntry | null>(null);
  const [savedIndex, setSavedIndex] = useState(0);
  const [savedFullView, setSavedFullView] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");
  const [toastKind, setToastKind] = useState<"success" | "error" | null>(null);
  const [dragEntryId, setDragEntryId] = useState<string | null>(null);
  const [dragReadyEntryId, setDragReadyEntryId] = useState<string | null>(null);
  const [dragOverEntryId, setDragOverEntryId] = useState<string | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    albumRepo
      .list()
      .then((items) => setEntries(items))
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setSavedEntry(null);
    setSavedIndex(0);
    setSavedFullView(false);
  }, [open]);

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

  const showToast = (kind: "success" | "error", title: string, description?: string) => {
    setToastKind(kind);
    setToastTitle(title);
    setToastDescription(description ?? "");
    setToastOpen(true);
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setIndex((prev) => Math.max(0, Math.min(prev, media.length - 2)));
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

      // Re-list so the UI always matches the repo's persisted ordering (and any server-side adjustments).
      const refreshed = await albumRepo.list().catch(() => null);
      const next = refreshed
        ? refreshed.some((e) => String(e.id) === String(newEntry.id))
          ? refreshed
          : [newEntry, ...refreshed]
        : [newEntry, ...entries];
      setEntries(next);
      albumRepo.persistEntries(next);

      setSavedEntry(newEntry);
      setSavedIndex(0);
      setSavedFullView(false);

      setNote("");
      setMedia([]);
      setPendingFiles({});
      setIndex(0);
      setFullView(false);

      showToast("success", "保存しました");
    } catch (e) {
      const message =
        e instanceof ApiRequestError && e.status === 413
          ? "ファイルサイズが大きすぎます。"
          : e instanceof ApiRequestError && e.status === 415
            ? "この形式は対応していません。"
            : e instanceof ApiRequestError && e.code === "FEATURE_NOT_AVAILABLE"
              ? "動画アップロードはPlus/Premium限定です。"
              : e instanceof ApiRequestError && e.code === "QUOTA_EXCEEDED"
                ? "アルバムの上限に達しました。"
                : "保存に失敗しました。通信状況を確認して再度お試しください。";
      showToast("error", "保存に失敗しました", message);
    } finally {
      setSaving(false);
    }
  };

  const persistEntries = (next: AlbumEntry[]) => {
    setEntries(next);
    albumRepo.persistEntries(next);
    setSavedEntry((prev) => {
      if (!prev) return prev;
      return next.find((entry) => entry.id === prev.id) ?? null;
    });
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await albumRepo.delete(String(id));
    } catch {
      return;
    }
    const next = entries.filter((entry) => entry.id !== id);
    persistEntries(next);
    if (savedEntry?.id === id) {
      setSavedEntry(next[0] ?? null);
      setSavedIndex(0);
      setSavedFullView(false);
    }
  };

  const handleMoveEntry = (id: string, direction: "up" | "down") => {
    const index = entries.findIndex((entry) => entry.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    const next = [...entries];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    persistEntries(next);
  };

  const handleReorderEntry = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = entries.findIndex((entry) => entry.id === fromId);
    const toIndex = entries.findIndex((entry) => entry.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...entries];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    persistEntries(next);
    setDragEntryId(null);
  };

  const startLongPress = (id: string, pointerType: string) => {
    if (pointerType === "mouse") {
      setDragReadyEntryId(id);
      return;
    }
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => {
      setDragReadyEntryId(id);
    }, 350);
  };

  const clearLongPress = () => {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = null;
    if (!dragEntryId) setDragReadyEntryId(null);
  };

  const current = media[index];
  const savedMedia = savedEntry?.media ?? [];
  const savedCurrent = savedMedia[savedIndex];

  const canPrev = index > 0;
  const canNext = index < media.length - 1;
  const savedPrev = savedIndex > 0;
  const savedNext = savedIndex < savedMedia.length - 1;

  const pagination = useMemo(() => {
    if (media.length === 0) return "0/0";
    return `${index + 1}/${media.length}`;
  }, [index, media.length]);

  return (
    <ToastProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[92vh] w-[94vw] max-w-[430px] overflow-y-auto rounded-2xl p-4"
          data-testid="album-modal"
        >
          <DialogHeader className="items-center">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Images className="h-4 w-4" />
              アルバムに追加
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-3">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Textarea
            placeholder="思い出メモ"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
            画像/動画を追加（最大{ALBUM_MEDIA_LIMIT}件）
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              multiple
              onChange={handleMediaChange}
              className="hidden"
              data-testid="album-upload-input"
            />
          </label>
          <div className="text-[11px] text-muted-foreground" data-testid="upload-help">
            {ALBUM_MEDIA_HELP}
          </div>

          {media.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>プレビュー</span>
                <div className="flex items-center gap-2">
                  <span>{pagination}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setFullView((prev) => !prev)}
                  >
                    {fullView ? (
                      <>
                        <Minimize2 className="mr-1 h-3.5 w-3.5" />
                        一覧に戻す
                      </>
                    ) : (
                      <>
                        <Maximize2 className="mr-1 h-3.5 w-3.5" />
                        全画面表示
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {fullView ? (
                <div className="space-y-2">
                  {media.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-xl border">
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          className="max-h-[60vh] w-full object-contain"
                          controls
                          muted
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.name ?? "アルバム"}
                          className="max-h-[60vh] w-full object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border">
                  {current?.type === "video" ? (
                    <video
                      src={current.url}
                      className="h-56 w-full object-cover"
                      controls
                      muted
                      playsInline
                    />
                  ) : current ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.url}
                      alt={current.name ?? "アルバム"}
                      className="h-56 w-full object-cover"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                    disabled={!canPrev}
                    className={cn(
                      "absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                      !canPrev && "opacity-40"
                    )}
                    aria-label="前へ"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((prev) => Math.min(media.length - 1, prev + 1))}
                    disabled={!canNext}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                      !canNext && "opacity-40"
                    )}
                    aria-label="次へ"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {media.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(idx)}
                    className={cn(
                      "relative overflow-hidden rounded-lg border",
                      idx === index && "ring-2 ring-[hsl(var(--accent))]"
                    )}
                  >
                    {item.type === "video" ? (
                      <div className="relative">
                        <video
                          src={item.url}
                          className="h-16 w-full object-cover"
                          muted
                          playsInline
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20" data-testid="album-video-overlay"><span className="rounded-full bg-black/60 px-2 py-1 text-xs text-white">▶</span></span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.name ?? "アルバム"}
                        className="h-16 w-full object-cover"
                      />
                    )}
                    <span
                      className="absolute right-1 top-1 z-10 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMedia(item.id);
                      }}
                    >
                      削除
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleSave} disabled={saving} data-testid="album-save">
              {saving ? "追加中..." : "追加する"}
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4" data-testid="album-saved-list">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-muted-foreground">保存済みアルバム</div>
            <div className="text-xs text-muted-foreground">{entries.length}件</div>
          </div>
           {entries.length === 0 ? (
             <div className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
               まだ保存されたアルバムがありません。
             </div>
           ) : (
            <div className="space-y-3" data-testid="album-list">
              {savedEntry ? (
                <div className="rounded-2xl border border-[hsl(var(--accent))]/40 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">{savedEntry.date}</div>
                      <div className="text-sm font-semibold">
                        {savedEntry.note || "メモなし"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{savedMedia.length}件</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSavedFullView((prev) => !prev)}
                      >
                        {savedFullView ? "一覧へ" : "全画面"}
                      </Button>
                    </div>
                  </div>

                  {savedMedia.length > 0 ? (
                    savedFullView ? (
                      <div className="mt-3 space-y-2">
                        {savedMedia.map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-xl border">
                            {item.type === "video" ? (
                              <video
                                src={item.url}
                                className="max-h-[60vh] w-full object-contain"
                                controls
                                muted
                                playsInline
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.url}
                                alt={item.name ?? "アルバム"}
                                className="max-h-[60vh] w-full object-contain"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative mt-3 overflow-hidden rounded-xl border">
                        {savedCurrent?.type === "video" ? (
                          <video
                            src={savedCurrent.url}
                            className="h-56 w-full object-cover"
                            controls
                            muted
                            playsInline
                          />
                        ) : savedCurrent ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={savedCurrent.url}
                            alt={savedCurrent.name ?? "アルバム"}
                            className="h-56 w-full object-cover"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSavedIndex((prev) => Math.max(0, prev - 1))}
                          disabled={!savedPrev}
                          className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                            !savedPrev && "opacity-40"
                          )}
                          aria-label="前へ"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSavedIndex((prev) =>
                              Math.min(savedMedia.length - 1, prev + 1)
                            )
                          }
                          disabled={!savedNext}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white",
                            !savedNext && "opacity-40"
                          )}
                          aria-label="次へ"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-rose-50 via-white to-sky-50" />
                  )}
                </div>
              ) : null}

              {entries.map((entry, entryIndex) => (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    savedEntry?.id === entry.id
                      ? "border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/5"
                      : "hover:bg-muted/40",
                    dragEntryId === entry.id && "opacity-60",
                    dragOverEntryId === entry.id && "ring-2 ring-[hsl(var(--accent))]/40"
                  )}
                  data-testid="album-entry"
                  data-entry-id={String(entry.id)}
                  role="button"
                  tabIndex={0}
                  draggable={dragReadyEntryId === entry.id}
                  onClick={() => {
                    setSavedEntry(entry);
                    setSavedIndex(0);
                    setSavedFullView(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSavedEntry(entry);
                      setSavedIndex(0);
                      setSavedFullView(false);
                    }
                  }}
                  onPointerDown={(event) => startLongPress(entry.id, event.pointerType)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onDragStart={(event) => {
                    setDragEntryId(entry.id);
                    event.dataTransfer.setData("text/plain", entry.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragEntryId(null);
                    setDragReadyEntryId(null);
                    setDragOverEntryId(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverEntryId(entry.id);
                  }}
                  onDragLeave={() => setDragOverEntryId(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromId = event.dataTransfer.getData("text/plain");
                    if (!fromId) return;
                    handleReorderEntry(fromId, entry.id);
                    setDragOverEntryId(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">{entry.date}</div>
                      <div className="text-sm font-semibold">{entry.note || "メモなし"}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMoveEntry(entry.id, "up");
                        }}
                        disabled={entryIndex === 0}
                        className={cn(
                          "rounded-full border p-1 text-muted-foreground transition hover:text-foreground",
                          entryIndex === 0 && "opacity-40"
                        )}
                        aria-label="上へ"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMoveEntry(entry.id, "down");
                        }}
                        disabled={entryIndex === entries.length - 1}
                        className={cn(
                          "rounded-full border p-1 text-muted-foreground transition hover:text-foreground",
                          entryIndex === entries.length - 1 && "opacity-40"
                        )}
                        aria-label="下へ"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                        className="rounded-full border border-red-200 p-1 text-red-500 transition hover:bg-red-50"
                        aria-label="削除"
                        data-testid="album-entry-delete"
                        data-entry-id={String(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {entry.media.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {entry.media.slice(0, 6).map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-lg border">
                            {item.type === "video" ? (
                              <div className="relative">
                                <video
                                  src={item.url}
                                  className="h-16 w-full object-cover"
                                  muted
                                  playsInline
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20" data-testid="album-video-overlay"><span className="rounded-full bg-black/60 px-2 py-1 text-xs text-white">▶</span></span>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.url}
                                alt={item.name ?? "アルバム"}
                                className="h-16 w-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-20 rounded-xl bg-gradient-to-br from-rose-50 via-white to-sky-50" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </DialogContent>
      </Dialog>

      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        data-testid={
          toastKind === "error"
            ? "upload-error"
            : toastKind === "success"
              ? "album-upload-success"
              : undefined
        }
      >
        <ToastTitle>{toastTitle}</ToastTitle>
        {toastDescription ? <ToastDescription>{toastDescription}</ToastDescription> : null}
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
