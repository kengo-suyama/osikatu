"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EVENTS } from "@/lib/events";
import { oshiRepo } from "@/lib/repo/oshiRepo";

type OshiImageUploadProps = {
  oshiId: string | number;
  label?: string;
  onChange?: (value: string) => void;
};

const MAX_SIZE = 1024;

async function resizeImage(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = dataUrl;
  });

  const maxEdge = Math.max(image.width, image.height);
  if (maxEdge <= MAX_SIZE) return file;

  const scale = MAX_SIZE / maxEdge;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

export default function OshiImageUpload({ oshiId, label, onChange }: OshiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const resized = await resizeImage(file);
      const updated = await oshiRepo.uploadImage(oshiId, resized);
      const image = updated?.profile.image_base64 ?? updated?.profile.image_url ?? null;
      if (image) onChange?.(image);
      if (updated && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(EVENTS.OSHI_PROFILE_CHANGE, { detail: { oshiId: updated.id } })
        );
      }
    } catch {
      return;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handlePick}
        className="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 gap-1 rounded-full px-3 text-[11px]"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Upload className="h-3.5 w-3.5" />
        {label ?? "画像変更"}
      </Button>
    </>
  );
}
