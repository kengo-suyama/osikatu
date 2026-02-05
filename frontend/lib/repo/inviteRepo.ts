import type { CircleDto, InviteDto } from "@/lib/types";
import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { circleRepo } from "@/lib/repo/circleRepo";
import { loadJson, saveJson } from "@/lib/storage";

export const inviteRepo = {
  async list(circleId: number): Promise<InviteDto[]> {
    if (!isApiMode()) return [];
    try {
      return await apiGet<InviteDto[]>(`/api/circles/${circleId}/invites`, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch {
      return [];
    }
  },

  async getInvite(circleId: number): Promise<InviteDto | null> {
    const key = `osikatu:circle:${circleId}:invite`;
    if (!isApiMode()) {
      const stored = loadJson<InviteDto>(key);
      if (stored) return stored;
      const code = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
      const fallback: InviteDto = {
        id: Date.now(),
        circleId,
        code,
        expiresAt: null,
        maxUses: null,
        usedCount: 0,
        createdAt: new Date().toISOString(),
      };
      saveJson(key, fallback);
      return fallback;
    }

    try {
      const invite = await apiGet<InviteDto>(`/api/circles/${circleId}/invite`, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
      saveJson(key, invite);
      return invite;
    } catch {
      return null;
    }
  },

  async joinByCode(code: string): Promise<CircleDto> {
    if (!isApiMode()) {
      const list = await circleRepo.list();
      return list[0] ?? (await circleRepo.get(1)) ?? {
        id: 1,
        name: "サークル",
        description: null,
        oshiLabel: null,
        oshiTag: null,
        oshiTags: [],
        isPublic: false,
        joinPolicy: "request",
        approvalRequired: true,
        iconUrl: null,
        maxMembers: null,
        memberCount: 0,
        planRequired: "free",
        myRole: "member",
        lastActivityAt: null,
        ui: {
          circleThemeId: null,
          specialBgEnabled: false,
          specialBgVariant: null,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return apiSend<CircleDto>(
      "/api/invites/accept",
      "POST",
      { code },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },
};
