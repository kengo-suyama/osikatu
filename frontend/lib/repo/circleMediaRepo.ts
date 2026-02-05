import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import type { CircleMediaDto, CircleMediaListDto } from "@/lib/types";

const STORAGE_KEY = (circleId: number) => `osikatu:circle:${circleId}:media`;

const loadLocal = (circleId: number): CircleMediaDto[] => {
  const stored = loadJson<CircleMediaDto[]>(STORAGE_KEY(circleId));
  return Array.isArray(stored) ? stored : [];
};

const saveLocal = (circleId: number, items: CircleMediaDto[]) => {
  saveJson(STORAGE_KEY(circleId), items);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });

export const circleMediaRepo = {
  async list(circleId: number): Promise<CircleMediaListDto> {
    if (!isApiMode()) {
      return { items: loadLocal(circleId) };
    }
    return apiGet<CircleMediaListDto>(`/api/circles/${circleId}/media`);
  },

  async create(
    circleId: number,
    params: { file: File; caption?: string | null }
  ): Promise<CircleMediaDto> {
    if (!isApiMode()) {
      const url = await readFileAsDataUrl(params.file);
      const type = params.file.type.startsWith("video/") ? "video" : "image";
      const item: CircleMediaDto = {
        id: Date.now(),
        circleId,
        type,
        url,
        caption: params.caption ?? null,
        createdAt: new Date().toISOString(),
      };
      const next = [item, ...loadLocal(circleId)];
      saveLocal(circleId, next);
      return item;
    }

    const form = new FormData();
    form.append("file", params.file);
    if (params.caption) form.append("caption", params.caption);
    return apiSend<CircleMediaDto>(`/api/circles/${circleId}/media`, "POST", form);
  },

  async remove(circleId: number, mediaId: number): Promise<{ deleted: boolean }> {
    if (!isApiMode()) {
      const next = loadLocal(circleId).filter((item) => item.id !== mediaId);
      saveLocal(circleId, next);
      return { deleted: true };
    }
    return apiSend<{ deleted: boolean }>(
      `/api/circles/${circleId}/media/${mediaId}`,
      "DELETE"
    );
  },
};
