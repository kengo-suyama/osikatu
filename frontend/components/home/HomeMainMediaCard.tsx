"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import FrameRenderer from "@/components/media/FrameRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { homeMediaRepo } from "@/lib/repo/homeMediaRepo";
import { ApiRequestError } from "@/lib/repo/http";
import type { HomeMediaItemDto } from "@/lib/types";

const HOME_MEDIA_HELP =
  "対応形式: jpg/jpeg/png/webp/mp4 / 上限: 20MB（通信が不安定だと失敗することがあります）";

export default function HomeMainMediaCard({ frameId }: { frameId?: string | null }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [item, setItem] = useState<HomeMediaItemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDescription, setToastDescription] = useState("");
  const [toastKind, setToastKind] = useState<"success" | "error" | null>(null);

  const showToast = (kind: "success" | "error", title: string, description?: string) => {
    setToastKind(kind);
    setToastTitle(title);
    setToastDescription(description ?? "");
    setToastOpen(true);
  };

  const resolveMediaUrl = (value: HomeMediaItemDto | null) => {
    if (!value) return null;
    const url = value.url;
    const updatedAt = value.updatedAt ?? null;
    if (!updatedAt) return url;
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(updatedAt)}`;
  };

  useEffect(() => {
    let mounted = true;
    homeMediaRepo
      .get()
      .then((data) => {
        if (!mounted) return;
        setItem(data);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ToastProvider>
      <Card className="rounded-2xl border p-4 shadow-sm" data-testid="home-main-media">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              ホームメイン（画像/動画）
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                data-testid="home-main-media-input"
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    const next = await homeMediaRepo.upload(file);
                    if (!next) {
                      showToast("error", "アップロード失敗", "この形式は対応していません。");
                      return;
                    }
                    // Invalidate: re-fetch once so UI always reflects the server truth.
                    const refreshed = await homeMediaRepo.get();
                    setItem(refreshed ?? next);
                    showToast("success", "アップロードしました", "ホームに反映しました。");
                  } catch (e) {
                    const message =
                      e instanceof ApiRequestError && e.status === 413
                        ? "ファイルサイズが大きすぎます。"
                        : e instanceof ApiRequestError && e.status === 415
                          ? "この形式は対応していません。"
                          : "通信状況を確認して再度お試しください。";
                    showToast("error", "アップロード失敗", message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                data-testid="home-hero-upload"
              >
                <UploadCloud className="mr-1 h-4 w-4" />
                {uploading ? "アップロード中..." : "アップロード"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {loading ? (
            <div className="text-xs text-muted-foreground">読み込み中...</div>
          ) : (
            <FrameRenderer
              frameId={frameId ?? "none"}
              className="aspect-[16/9]"
              contentClassName="overflow-hidden rounded-xl"
              testId="home-hero-media"
            >
              {item?.type === "video" ? (
                <video
                  src={resolveMediaUrl(item) ?? undefined}
                  controls
                  className="h-full w-full object-cover"
                  data-testid="home-main-media-video"
                />
              ) : item?.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(item) ?? undefined}
                  alt="home media"
                  className="h-full w-full object-cover"
                  data-testid="home-main-media-image"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-100 via-white to-amber-100 text-xs text-muted-foreground">
                  まだありません（アップロードしてみてね）
                </div>
              )}
            </FrameRenderer>
          )}
          <div className="text-[11px] text-muted-foreground">
            <span data-testid="upload-help">
              {uploading ? "通信状況によって時間がかかる場合があります。" : HOME_MEDIA_HELP}
            </span>
          </div>
        </CardContent>
      </Card>

      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="rounded-xl border border-white/20 bg-white/90 text-sm text-foreground"
        data-testid={
          toastKind === "success"
            ? "home-hero-upload-success"
            : toastKind === "error"
              ? "upload-error"
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
