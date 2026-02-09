import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import type { HomeMediaItemDto, MeHomeMediaResponseDto } from "@/lib/types";

const HOME_MEDIA_KEY = "osikatu:home:media";

export const homeMediaRepo = {
  async get(): Promise<HomeMediaItemDto | null> {
    if (isApiMode()) {
      try {
        const data = await apiGet<MeHomeMediaResponseDto>("/api/me/media/home");
        return data.item ?? null;
      } catch {
        return null;
      }
    }

    const stored = loadJson<HomeMediaItemDto>(HOME_MEDIA_KEY);
    return stored ?? null;
  },

  async upload(file: File): Promise<HomeMediaItemDto | null> {
    if (isApiMode()) {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiSend<MeHomeMediaResponseDto>("/api/me/media/home", "POST", fd);
      return data.item ?? null;
    }

    // Local MVP: support images only (videos are too large for localStorage).
    if (!file.type.startsWith("image/")) {
      return null;
    }

    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

    const item: HomeMediaItemDto = {
      type: "image",
      url,
      mime: file.type,
      sizeBytes: file.size,
      width: null,
      height: null,
      updatedAt: new Date().toISOString(),
    };
    saveJson(HOME_MEDIA_KEY, item);
    return item;
  },
};

