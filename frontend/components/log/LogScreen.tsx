"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Trash2 } from "lucide-react";

import MotionCard from "@/components/feed/MotionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { isApiMode } from "@/lib/config";
import { logPosts, logTemplates } from "@/lib/dummy";
import { createDiary, deleteDiary, listDiaries } from "@/lib/repo/diaryRepo";
import { oshiRepo } from "@/lib/repo/oshiRepo";
import { loadJson, saveJson } from "@/lib/storage";
import type { DiaryDto } from "@/lib/types";
import type { LogPost } from "@/lib/uiTypes";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "osikatu:logs";
const LOG_IMAGE_LIMIT = 4;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });

const readImages = async (files: FileList, limit: number) => {
  const targets = Array.from(files)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, limit);
  const urls = await Promise.all(targets.map((file) => readFileAsDataUrl(file)));
  return { urls, files: targets };
};


export default function LogScreen() {
  const apiMode = isApiMode();
  const [userPosts, setUserPosts] = useState<LogPost[]>([]);
  const [posts, setPosts] = useState<LogPost[]>(logPosts);
  const [diaries, setDiaries] = useState<DiaryDto[]>([]);
  const [loadingDiaries, setLoadingDiaries] = useState(false);
  const [primaryOshiId, setPrimaryOshiId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logImages, setLogImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");
  const [dragLogIndex, setDragLogIndex] = useState<number | null>(null);
  const [dragReadyLogIndex, setDragReadyLogIndex] = useState<number | null>(null);
  const [dragOverLogIndex, setDragOverLogIndex] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (apiMode) {
      setLoadingDiaries(true);
      listDiaries()
        .then((items) => setDiaries(items))
        .catch(() => setDiaries([]))
        .finally(() => setLoadingDiaries(false));

      oshiRepo.getOshis().then((list) => {
        const primary = list.find((o) => o.is_primary) ?? list[0];
        if (primary) setPrimaryOshiId(Number(primary.id));
      }).catch(() => {});
      return;
    }
    const stored = loadJson<LogPost[]>(STORAGE_KEY);
    if (stored && stored.length > 0) {
      setUserPosts(stored);
      setPosts([...stored, ...logPosts]);
    }
  }, [apiMode]);

  const showToast = (titleValue: string, descriptionValue?: string) => {
    setToastTitle(titleValue);
    setToastDescription(descriptionValue ?? "");
    setToastOpen(true);
  };

  const handleTemplate = (template: (typeof logTemplates)[number]) => {
    setTitle(template.title);
    setBody("今日はこんな感じだった…");
    setTags(template.tags.map((tag) => `#${tag}`).join(" "));
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim() && logImages.length === 0) return;
    const parsedTags = tags
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, ""))
      .filter(Boolean);

    if (apiMode) {
      if (!primaryOshiId) {
        showToast("推しが登録されていません");
        return;
      }
      setSaving(true);
      try {
        const created = await createDiary({
          oshiId: primaryOshiId,
          title: title || "メモ",
          content: body,
          diaryDate: logDate || new Date().toISOString().slice(0, 10),
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          images: imageFiles.length > 0 ? imageFiles : undefined,
        });
        setDiaries((prev) => [created, ...prev]);
        showToast("保存しました");
      } catch {
        showToast("保存に失敗しました");
      } finally {
        setSaving(false);
      }
    } else {
      const newPost: LogPost = {
        id: `log-${Date.now()}`,
        title: title || "メモ",
        body,
        tags: parsedTags,
        time: "たった今",
        date: logDate || new Date().toISOString().slice(0, 10),
        images: logImages.length > 0 ? logImages : undefined,
        isPrivate,
      };

      const nextUser = [newPost, ...userPosts];
      setUserPosts(nextUser);
      setPosts([...nextUser, ...logPosts]);
      saveJson(STORAGE_KEY, nextUser);
    }

    setTitle("");
    setBody("");
    setTags("");
    setLogImages([]);
    setImageFiles([]);
    setIsPrivate(false);
  };

  const handleLogImagesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const remaining = LOG_IMAGE_LIMIT - logImages.length;
    if (remaining <= 0) return;
    const { urls, files: rawFiles } = await readImages(files, remaining);
    setLogImages((prev) => [...prev, ...urls]);
    setImageFiles((prev) => [...prev, ...rawFiles]);
    event.target.value = "";
  };

  const removeLogImage = (index: number) => {
    setLogImages((prev) => prev.filter((_, idx) => idx !== index));
    setImageFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const reorderLogImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setLogImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setImageFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const startLogLongPress = (index: number, pointerType: string) => {
    if (pointerType === "mouse") {
      setDragReadyLogIndex(index);
      return;
    }
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => {
      setDragReadyLogIndex(index);
    }, 350);
  };

  const clearLogLongPress = () => {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = null;
    if (dragLogIndex === null) setDragReadyLogIndex(null);
  };

  const handleDeleteLocalPost = (postId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("このログを削除しますか？")
    ) {
      return;
    }
    setDeletingId(postId);
    const nextUser = userPosts.filter((post) => post.id !== postId);
    setUserPosts(nextUser);
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    saveJson(STORAGE_KEY, nextUser);
    showToast("削除しました");
    setDeletingId(null);
  };

  const handleDeleteDiary = async (diaryId: number) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("このログを削除しますか？")
    ) {
      return;
    }
    setDeletingId(diaryId);
    try {
      const result = await deleteDiary(diaryId);
      setDiaries((prev) => prev.filter((item) => item.id !== diaryId));
      if (result === "not_found") {
        showToast("既に削除されています");
      } else {
        showToast("削除しました");
      }
    } catch {
      showToast("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ToastProvider>
      <div
        className="space-y-4"
        data-testid="log-mode"
        data-mode={hydrated ? (apiMode ? "api" : "local") : "loading"}
      >
        <div>
          <h1 className="text-lg font-semibold">ログ</h1>
          <p className="text-xs text-muted-foreground">今日の記録をSNS風に残そう。</p>
        </div>

        <Card className="rounded-2xl border p-4 shadow-sm" data-testid="log-create-form">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-muted-foreground">テンプレ投稿</div>
            <div className="flex flex-wrap gap-2">
              {logTemplates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleTemplate(template)}
                >
                  {template.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Input
                type="date"
                value={logDate}
                onChange={(event) => setLogDate(event.target.value)}
              />
              <Input
                placeholder="タイトル"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                data-testid="log-create-title"
              />
              <Textarea
                placeholder="今日の出来事は？"
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                data-testid="log-create-body"
              />
              <div className="space-y-2" data-testid="log-create-images">
                <div className="text-xs text-muted-foreground">
                  添付写真（最大{LOG_IMAGE_LIMIT}枚）
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  画像を追加
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleLogImagesChange}
                    className="hidden"
                  />
                </label>
                {logImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {logImages.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className={cn(
                          "relative overflow-hidden rounded-xl border",
                          dragLogIndex === index && "opacity-60",
                          dragOverLogIndex === index && "ring-2 ring-[hsl(var(--accent))]/40"
                        )}
                        draggable={dragReadyLogIndex === index}
                        onPointerDown={(event) => startLogLongPress(index, event.pointerType)}
                        onPointerUp={clearLogLongPress}
                        onPointerLeave={clearLogLongPress}
                        onPointerCancel={clearLogLongPress}
                        onDragStart={(event) => {
                          setDragLogIndex(index);
                          event.dataTransfer.setData("text/plain", String(index));
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragLogIndex(null);
                          setDragReadyLogIndex(null);
                          setDragOverLogIndex(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverLogIndex(index);
                        }}
                        onDragLeave={() => setDragOverLogIndex(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                          if (Number.isNaN(fromIndex)) return;
                          reorderLogImages(fromIndex, index);
                          setDragOverLogIndex(null);
                        }}
                      >
                        <img src={src} alt="添付写真" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeLogImage(index)}
                          className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <Input
                placeholder="#現場 #開封 #配信"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                data-testid="log-create-tags"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                  className="h-4 w-4 rounded border border-border"
                />
                非公開で保存する
              </label>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving}
                data-testid="log-create-submit"
              >
                {saving ? "保存中…" : "保存する"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {!hydrated ? (
            <div className="py-4 text-center text-sm opacity-70">読み込み中…</div>
          ) : apiMode ? (
            diaries.map((diary) => (
                <MotionCard key={diary.id} cardClassName="p-4" data-testid="log-diary-card">
                  <div className="space-y-2" data-testid="log-diary-card" data-diary-id={diary.id}>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{diary.diaryDate ?? diary.createdAt ?? ""}</span>
                      <button
                        type="button"
                        aria-label="削除"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDeleteDiary(diary.id)}
                        disabled={deletingId === diary.id}
                        data-testid="diary-delete"
                        data-diary-id={diary.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {diary.attachments && diary.attachments.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2" data-testid="log-diary-images">
                        {diary.attachments.map((att) => (
                          <img
                            key={att.id}
                            src={att.url}
                            alt="添付写真"
                            className="h-28 w-full rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                    <div className="text-sm font-semibold">{diary.title}</div>
                    <p className="text-sm text-foreground/90">{diary.content}</p>
                    {diary.tags && diary.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" data-testid="log-diary-tags">
                        {diary.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5">#{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </MotionCard>
              ))
          ) : (
            posts.map((post) => (
                <MotionCard key={post.id} cardClassName="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{post.date ?? post.time}</span>
                        {post.isPrivate ? (
                          <span className="rounded-full bg-muted px-2 py-0.5">非公開</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="削除"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLocalPost(post.id)}
                        disabled={deletingId === post.id}
                        data-testid="diary-delete"
                        data-diary-id={post.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {post.images && post.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {post.images.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt="添付写真"
                            className="h-28 w-full rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    ) : post.image ? (
                      <div className="h-36 rounded-xl bg-gradient-to-br from-rose-100 via-white to-sky-100" />
                    ) : null}
                    <div className="text-sm font-semibold">{post.title}</div>
                    <p className="text-sm text-foreground/90">{post.body}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </MotionCard>
              ))
          )}
          {hydrated && apiMode && !loadingDiaries && diaries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-70">
              ログがまだありません
            </div>
          ) : null}
          {hydrated && apiMode && loadingDiaries ? (
            <div className="py-4 text-center text-sm opacity-70">読み込み中…</div>
          ) : null}
        </div>
      </div>

      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="rounded-xl border border-white/20 bg-white/90 text-sm text-foreground"
        data-testid="toast"
        duration={3000}
      >
        <ToastTitle>{toastTitle}</ToastTitle>
        {toastDescription ? (
          <ToastDescription>{toastDescription}</ToastDescription>
        ) : null}
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
