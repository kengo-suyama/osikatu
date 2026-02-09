"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Search, X, Trash2 } from "lucide-react";

import MotionCard from "@/components/feed/MotionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastProvider,
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
const SEARCH_DEBOUNCE_MS = 400;

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

  // --- Search / Filter state ---
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [hasPhotoOnly, setHasPhotoOnly] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergeDiariesById = (prev: DiaryDto[], incoming: DiaryDto[]) => {

    // Prevent overwriting freshly-created items when an older list response resolves later.

    // Prevent overwriting freshly-created items when a slower initial list response resolves later.
    // Prefer `incoming` values for the same `id` (server is source of truth).

    const out = [...prev];
    const indexById = new Map<number, number>();
    out.forEach((item, idx) => indexById.set(item.id, idx));

    for (const item of incoming) {
      const existingIdx = indexById.get(item.id);
      if (existingIdx === undefined) {
        indexById.set(item.id, out.length);
        out.push(item);
      } else {
        out[existingIdx] = item;
      }
    }

    return out;
  };
  const collectTags = (items: DiaryDto[]) => {
    const tagSet = new Set<string>();
    for (const d of items) {
      if (d.tags) d.tags.forEach((t) => tagSet.add(t));
    }
    return Array.from(tagSet).sort();
  };

  const fetchDiaries = useCallback(
    async (q?: string, tag?: string, hasPhoto?: boolean) => {
      setLoadingDiaries(true);
      try {
        const filters =
          q || tag || hasPhoto !== undefined
            ? { q: q || undefined, tag: tag || undefined, hasPhoto }
            : undefined;
        const items = await listDiaries(filters);
        if (!q && !tag && hasPhoto === undefined) {
          // Full load: replace & rebuild tag list
          setDiaries(items);
          setAllTags(collectTags(items));
        } else {
          // Filtered: just show results, keep tag list
          setDiaries(items);
        }
      } catch {
        setDiaries([]);
      } finally {
        setLoadingDiaries(false);
      }
    },
    [],
  );
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (apiMode) {
      fetchDiaries();

      oshiRepo.getOshis().then((list) => {
        const primary = list.find((o) => o.is_primary) ?? list[0];
        if (primary) {
          const idNum = Number(primary.id);
          if (Number.isFinite(idNum)) setPrimaryOshiId(idNum);
        }
      }).catch(() => {});
      return;
    }
    const stored = loadJson<LogPost[]>(STORAGE_KEY);
    if (stored && stored.length > 0) {
      setUserPosts(stored);
      setPosts([...stored, ...logPosts]);
    }
  }, [apiMode, fetchDiaries]);

  // Debounced search
  useEffect(() => {
    if (!apiMode) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setActiveQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchInput, apiMode]);

  // Re-fetch when active filters change
  useEffect(() => {
    if (!apiMode) return;
    fetchDiaries(activeQuery || undefined, activeTag || undefined, hasPhotoOnly ? true : undefined);
  }, [activeQuery, activeTag, hasPhotoOnly, apiMode, fetchDiaries]);

  const clearFilters = () => {
    setSearchInput("");
    setActiveQuery("");
    setActiveTag(null);
    setHasPhotoOnly(false);
  };

  const hasActiveFilter = activeQuery !== "" || activeTag !== null || hasPhotoOnly;

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
      setSaving(true);
      try {


        // E2E (and fast users) can click before `oshiRepo.getOshis()` resolves.
        // Resolve primary oshi id lazily to avoid flaky early-returns.

        let oshiId = primaryOshiId;
        if (!oshiId) {
          const list = await oshiRepo.getOshis().catch(() => []);
          const primary = list.find((o) => o.is_primary) ?? list[0];
          if (primary) {
            const idNum = Number(primary.id);
            if (Number.isFinite(idNum)) {
              oshiId = idNum;
              setPrimaryOshiId(idNum);
            }
          }
        }
        if (!oshiId) {
          showToast("推しが登録されていません");
          return;
        }

        const created = await createDiary({
          oshiId,
          title: title || "メモ",
          content: body,
          diaryDate: logDate || new Date().toISOString().slice(0, 10),
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          images: imageFiles.length > 0 ? imageFiles : undefined,
        });
        setDiaries((prev) => [created, ...prev]);
        // Add any new tags to the tag list
        if (parsedTags.length > 0) {
          setAllTags((prev) => {
            const s = new Set(prev);
            parsedTags.forEach((t) => s.add(t));
            return Array.from(s).sort();
          });
        }
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
                    data-testid="diary-photo-upload"
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <div data-testid="diary-tag-input">
                <Input
                  placeholder="#現場 #開封 #配信"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  data-testid="log-create-tags"
                />
              </div>
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
                disabled={saving || (apiMode && !primaryOshiId)}
                data-testid="log-create-submit"
              >
                {saving ? "保存中…" : (apiMode && !primaryOshiId) ? "読み込み中…" : "保存する"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Search & Filter bar (API mode only) */}
        {hydrated && apiMode ? (
          <div className="space-y-2" data-testid="log-filter-bar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトル・本文で検索…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-9 pr-8"
                data-testid="log-search-input"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setActiveQuery(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="検索をクリア"
                  data-testid="log-search-clear"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5" data-testid="log-tag-filters">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                      activeTag === tag
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    data-testid="log-tag-filter-chip"
                    data-tag={tag}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-xl border bg-white/5 px-3 py-2">
              <div className="text-xs text-muted-foreground">写真ありのみ</div>
              <Switch
                checked={hasPhotoOnly}
                onCheckedChange={setHasPhotoOnly}
                data-testid="log-filter-hasphoto"
              />
            </div>
            <div
              className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              data-testid="log-filter-active"
            >
              {hasActiveFilter ? (
                <>
                  {activeQuery ? (
                    <span className="rounded-full bg-muted px-2 py-0.5">検索: {activeQuery}</span>
                  ) : null}
                  {activeTag ? (
                    <span className="rounded-full bg-muted px-2 py-0.5">タグ: #{activeTag}</span>
                  ) : null}
                  {hasPhotoOnly ? (
                    <span className="rounded-full bg-muted px-2 py-0.5">写真あり</span>
                  ) : null}
                </>
              ) : (
                <span className="opacity-70">フィルタ: なし</span>
              )}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className={cn(
                "text-left text-xs underline transition-colors",
                hasActiveFilter
                  ? "text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/50"
              )}
              disabled={!hasActiveFilter}
              data-testid="log-filter-clear-all"
            >
              フィルタをクリア
            </button>
          </div>
        ) : null}
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
                          // eslint-disable-next-line @next/next/no-img-element
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
                          // eslint-disable-next-line @next/next/no-img-element
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
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
              data-testid="log-empty-state"
            >
              <div className="text-sm font-medium">
                {hasActiveFilter ? "条件に一致するログがありません" : "ログがまだありません"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {hasActiveFilter
                  ? "フィルタを外すと見つかるかもしれません。"
                  : "上のフォームから今日の推し活をメモしてみよう。写真も付けられます。"}
              </div>
              {hasActiveFilter ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={clearFilters}
                    data-testid="log-empty-clear-filters"
                  >
                    フィルタをクリア
                  </Button>
                </div>
              ) : null}
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
