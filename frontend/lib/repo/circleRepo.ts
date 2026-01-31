import type { CircleDto } from "@/lib/types";
import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { loadJson, saveJson } from "@/lib/storage";

const CIRCLES_KEY = "osikatu:circles";

const defaultCircles = (): CircleDto[] => [
  {
    id: 1,
    name: "デモサークル",
    description: "オーナーダッシュボード表示用",
    oshiLabel: "デモ",
    oshiTag: "demo",
    oshiTags: ["demo"],
    isPublic: false,
    joinPolicy: "request",
    iconUrl: null,
    maxMembers: 30,
    memberCount: 8,
    planRequired: "free",
    lastActivityAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ensureLocalCircles = (): CircleDto[] => {
  const stored = loadJson<CircleDto[]>(CIRCLES_KEY);
  if (stored && stored.length) return stored;
  const seeded = defaultCircles();
  saveJson(CIRCLES_KEY, seeded);
  return seeded;
};

export const circleRepo = {
  async list(): Promise<CircleDto[]> {
    try {
      return await apiGet<CircleDto[]>("/api/circles", {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch {
      return ensureLocalCircles();
    }
  },

  async get(id: number): Promise<CircleDto> {
    try {
      return await apiGet<CircleDto>(`/api/circles/${id}`, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch {
      const list = ensureLocalCircles();
      const found = list.find((circle) => circle.id === id);
      if (found) return found;
      return list[0];
    }
  },

  async create(payload: {
    name: string;
    description?: string | null;
    oshiLabel: string;
    oshiTags: string[];
    isPublic?: boolean;
    joinPolicy?: "request" | "instant";
    maxMembers?: number | null;
  }): Promise<CircleDto> {
    const createLocal = () => {
      const list = ensureLocalCircles();
      const nextId = Math.max(...list.map((item) => item.id), 0) + 1;
      const next: CircleDto = {
        id: nextId,
        name: payload.name,
        description: payload.description ?? null,
        oshiLabel: payload.oshiLabel,
        oshiTag: payload.oshiTags[0] ?? null,
        oshiTags: payload.oshiTags,
        isPublic: Boolean(payload.isPublic),
        joinPolicy: payload.joinPolicy ?? "request",
        iconUrl: null,
        maxMembers: payload.maxMembers ?? 30,
        memberCount: 1,
        planRequired: "free",
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nextList = [next, ...list];
      saveJson(CIRCLES_KEY, nextList);
      return next;
    };

    if (!isApiMode()) {
      return createLocal();
    }

    try {
      return await apiSend<CircleDto>(
        "/api/circles",
        "POST",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    } catch (err) {
      throw err;
    }
  },

  async search(params: { q?: string; tag?: string; oshi?: string }): Promise<CircleDto[]> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.tag) query.set("tag", params.tag);
    if (params.oshi) query.set("oshi", params.oshi);
    const suffix = query.toString();
    try {
      return await apiGet<CircleDto[]>(`/api/circles/search${suffix ? `?${suffix}` : ""}`);
    } catch {
      const list = ensureLocalCircles();
      return list.filter((circle) => {
        if (!(circle.isPublic ?? false)) return false;
        const tag = params.tag?.toLowerCase() ?? "";
        const oshi = params.oshi?.toLowerCase() ?? "";
        const name = params.q?.toLowerCase() ?? "";
        const matchesTag = tag
          ? (circle.oshiTags ?? [circle.oshiTag ?? ""]).some((item) =>
              item.toLowerCase().startsWith(tag)
            )
          : true;
        const matchesLabel = oshi
          ? (circle.oshiLabel ?? "").toLowerCase().includes(oshi)
          : true;
        const matchesName = name ? circle.name.toLowerCase().includes(name) : true;
        return matchesTag && matchesLabel && matchesName;
      });
    }
  },
};
