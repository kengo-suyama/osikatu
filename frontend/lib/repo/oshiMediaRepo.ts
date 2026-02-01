import { isApiMode } from "@/lib/config";
import { loadJson, saveJson } from "@/lib/storage";
import { apiGet, apiSend } from "@/lib/repo/http";

export type OshiMediaType = "image" | "video";

export type OshiMediaItem = {
  id: string;
  mediaType: OshiMediaType;
  url: string;
  thumbUrl?: string | null;
  frameId: string;
  isPrimary: boolean;
  createdAt: string;
};

export type OshiMediaLimits = {
  mediaMax: number;
  frameMax?: number;
};

export type OshiFrameTier = "free" | "premium" | "plus";
export type OshiFrameDto = { id: string; label: string; tier: OshiFrameTier };

export type OshiMediaIndexDto = {
  items: OshiMediaItem[];
  limits: OshiMediaLimits;
  frames?: OshiFrameDto[];
};

const BASE = "/api/me/oshi-media";
const MEDIA_KEY = "osikatu:oshi:media";

const nowIso = () => new Date().toISOString();

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("failed to read file"));
    reader.readAsDataURL(file);
  });

const loadLocalItems = (): OshiMediaItem[] => {
  const stored = loadJson<OshiMediaItem[]>(MEDIA_KEY);
  return Array.isArray(stored) ? stored : [];
};

const saveLocalItems = (items: OshiMediaItem[]) => {
  saveJson(MEDIA_KEY, items);
};

const ensurePrimary = (items: OshiMediaItem[], primaryId: string | null) => {
  if (!primaryId) return items;
  return items.map((item) => ({
    ...item,
    isPrimary: item.id === primaryId,
  }));
};

/**
 * List media items for the home screen.
 */
export async function getOshiMedia(): Promise<OshiMediaIndexDto> {
  if (!isApiMode()) {
    return {
      items: loadLocalItems(),
      limits: { mediaMax: 5 },
    };
  }

  return apiGet<OshiMediaIndexDto>(BASE);
}

/**
 * Create a media item. Optionally attach a video thumbnail.
 */
export async function createOshiMedia(params: {
  mediaType: OshiMediaType;
  file: File;
  thumbFile?: File | null;
  frameId?: string;
  isPrimary?: boolean;
}): Promise<{ item: OshiMediaItem }> {
  if (!isApiMode()) {
    const url = await readFileAsDataUrl(params.file);
    const thumbUrl = params.thumbFile ? await readFileAsDataUrl(params.thumbFile) : null;
    const item: OshiMediaItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mediaType: params.mediaType,
      url,
      thumbUrl,
      frameId: params.frameId ?? "none",
      isPrimary: Boolean(params.isPrimary),
      createdAt: nowIso(),
    };
    const items = loadLocalItems();
    const nextItems = ensurePrimary(
      [...items, item],
      item.isPrimary ? item.id : null
    );
    saveLocalItems(nextItems);
    return { item };
  }

  const fd = new FormData();
  fd.append("mediaType", params.mediaType);
  fd.append("file", params.file);
  if (params.thumbFile) fd.append("thumb", params.thumbFile);
  if (params.frameId) fd.append("frameId", params.frameId);
  if (typeof params.isPrimary === "boolean") {
    fd.append("isPrimary", String(params.isPrimary));
  }

  return apiSend<{ item: OshiMediaItem }>(BASE, "POST", fd);
}

/**
 * Update frame ID (selected in UI).
 */
export async function updateFrameId(
  mediaId: string,
  frameId: string
): Promise<{ item: OshiMediaItem }> {
  if (!isApiMode()) {
    const items = loadLocalItems();
    const nextItems = items.map((item) =>
      item.id === mediaId ? { ...item, frameId } : item
    );
    saveLocalItems(nextItems);
    const item = nextItems.find((entry) => entry.id === mediaId);
    if (!item) throw new Error("media not found");
    return { item };
  }

  return apiSend<{ item: OshiMediaItem }>(`${BASE}/${encodeURIComponent(mediaId)}`, "PUT", {
    frameId,
  });
}

/**
 * Toggle primary media item (large display on home).
 */
export async function setPrimary(
  mediaId: string,
  isPrimary: boolean
): Promise<{ item: OshiMediaItem }> {
  if (!isApiMode()) {
    const items = loadLocalItems();
    const nextItems = ensurePrimary(
      items.map((item) =>
        item.id === mediaId ? { ...item, isPrimary } : item
      ),
      isPrimary ? mediaId : null
    );
    saveLocalItems(nextItems);
    const item = nextItems.find((entry) => entry.id === mediaId);
    if (!item) throw new Error("media not found");
    return { item };
  }

  return apiSend<{ item: OshiMediaItem }>(`${BASE}/${encodeURIComponent(mediaId)}`, "PUT", {
    isPrimary,
  });
}

/**
 * Replace video thumbnail only.
 */
export async function updateThumb(
  mediaId: string,
  thumbFile: File
): Promise<{ item: OshiMediaItem }> {
  if (!isApiMode()) {
    const thumbUrl = await readFileAsDataUrl(thumbFile);
    const items = loadLocalItems();
    const nextItems = items.map((item) =>
      item.id === mediaId ? { ...item, thumbUrl } : item
    );
    saveLocalItems(nextItems);
    const item = nextItems.find((entry) => entry.id === mediaId);
    if (!item) throw new Error("media not found");
    return { item };
  }

  const fd = new FormData();
  fd.append("thumb", thumbFile);

  return apiSend<{ item: OshiMediaItem }>(`${BASE}/${encodeURIComponent(mediaId)}`, "PUT", fd);
}

/**
 * Replace media (server is expected to swap files).
 */
export async function replaceMedia(params: {
  mediaId: string;
  file: File;
  thumbFile?: File | null;
}): Promise<{ item: OshiMediaItem }> {
  if (!isApiMode()) {
    const url = await readFileAsDataUrl(params.file);
    const thumbUrl = params.thumbFile ? await readFileAsDataUrl(params.thumbFile) : null;
    const items = loadLocalItems();
    const nextItems = items.map((item) =>
      item.id === params.mediaId ? { ...item, url, thumbUrl } : item
    );
    saveLocalItems(nextItems);
    const item = nextItems.find((entry) => entry.id === params.mediaId);
    if (!item) throw new Error("media not found");
    return { item };
  }

  const fd = new FormData();
  fd.append("file", params.file);
  if (params.thumbFile) fd.append("thumb", params.thumbFile);

  return apiSend<{ item: OshiMediaItem }>(
    `${BASE}/${encodeURIComponent(params.mediaId)}/replace`,
    "POST",
    fd
  );
}

/**
 * Delete a media item.
 */
export async function deleteOshiMedia(
  mediaId: string
): Promise<{ deleted: true }> {
  if (!isApiMode()) {
    const items = loadLocalItems();
    const nextItems = items.filter((item) => item.id !== mediaId);
    saveLocalItems(nextItems);
    return { deleted: true };
  }

  return apiSend<{ deleted: true }>(`${BASE}/${encodeURIComponent(mediaId)}`, "DELETE");
}
