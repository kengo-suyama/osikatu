import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import type { AlbumEntry, LogMedia } from "@/lib/uiTypes";
import type {
  UserAlbumDeleteResponseDto,
  UserAlbumItemDto,
  UserAlbumListDto,
} from "@/lib/types";

const ALBUM_KEY = "osikatu:album";
const ALBUM_ORDER_KEY = "osikatu:album:order";

const today = () => new Date().toISOString().slice(0, 10);

const makeId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

const toUiEntry = (dto: UserAlbumItemDto): AlbumEntry => {
  return {
    id: String(dto.id),
    date: dto.date ?? today(),
    note: dto.note ?? "",
    media: (dto.media ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      name: m.name ?? undefined,
    })),
  };
};

function applyOrder(entries: AlbumEntry[], order: string[] | null): AlbumEntry[] {
  if (!order || order.length === 0) return entries;
  const index = new Map(order.map((id, i) => [String(id), i]));
  return [...entries].sort((a, b) => {
    const ai = index.get(String(a.id));
    const bi = index.get(String(b.id));
    if (ai === undefined && bi === undefined) return 0;
    if (ai === undefined) return 1;
    if (bi === undefined) return -1;
    return ai - bi;
  });
}

export const albumRepo = {
  async list(): Promise<AlbumEntry[]> {
    if (isApiMode()) {
      const order = loadJson<string[]>(ALBUM_ORDER_KEY);
      const data = await apiGet<UserAlbumListDto>("/api/me/album");
      return applyOrder(data.items.map(toUiEntry), order ?? null);
    }

    return loadJson<AlbumEntry[]>(ALBUM_KEY) ?? [];
  },

  async createLocal(payload: {
    date?: string | null;
    note?: string | null;
    media: LogMedia[];
  }): Promise<AlbumEntry> {
    const entries = loadJson<AlbumEntry[]>(ALBUM_KEY) ?? [];
    const entry: AlbumEntry = {
      id: makeId("album"),
      date: payload.date ?? today(),
      note: payload.note ?? "",
      media: payload.media,
    };
    const next = [entry, ...entries];
    saveJson(ALBUM_KEY, next);
    return entry;
  },

  async createApi(payload: {
    date?: string | null;
    note?: string | null;
    files: File[];
  }): Promise<AlbumEntry> {
    const fd = new FormData();
    if (payload.date) fd.append("date", payload.date);
    if (payload.note) fd.append("note", payload.note);
    payload.files.forEach((file) => fd.append("files[]", file));

    const dto = await apiSend<UserAlbumItemDto>("/api/me/album", "POST", fd);
    const created = toUiEntry(dto);

    const order = loadJson<string[]>(ALBUM_ORDER_KEY) ?? [];
    const nextOrder = [
      String(created.id),
      ...order.filter((id) => String(id) !== String(created.id)),
    ];
    saveJson(ALBUM_ORDER_KEY, nextOrder);

    return created;
  },

  async delete(id: string): Promise<void> {
    if (isApiMode()) {
      await apiSend<UserAlbumDeleteResponseDto>(`/api/me/album/${id}`, "DELETE");
      const order = loadJson<string[]>(ALBUM_ORDER_KEY) ?? [];
      saveJson(
        ALBUM_ORDER_KEY,
        order.filter((x) => String(x) !== String(id))
      );
      return;
    }

    const entries = loadJson<AlbumEntry[]>(ALBUM_KEY) ?? [];
    saveJson(
      ALBUM_KEY,
      entries.filter((e) => String(e.id) !== String(id))
    );
  },

  persistEntries(next: AlbumEntry[]): void {
    if (isApiMode()) {
      saveJson(ALBUM_ORDER_KEY, next.map((e) => String(e.id)));
      return;
    }
    saveJson(ALBUM_KEY, next);
  },
};

