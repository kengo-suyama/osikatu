import { isApiMode } from "@/lib/config";
import { getDeviceId } from "@/lib/device";
import { apiGet, apiSend } from "@/lib/repo/http";
import type { JoinRequestDto } from "@/lib/types";

export const joinRequestRepo = {
  async requestJoin(circleId: number, message?: string): Promise<JoinRequestDto | null> {
    if (!isApiMode()) {
      return {
        id: Date.now(),
        member: { id: 0, nickname: "Member", avatarUrl: null, initial: "M", role: "member" },
        message: message ?? null,
        status: "pending",
        requestedAt: new Date().toISOString(),
      };
    }

    return apiSend<JoinRequestDto>(
      `/api/circles/${circleId}/join-requests`,
      "POST",
      { message },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async listPending(circleId: number): Promise<JoinRequestDto[]> {
    if (!isApiMode()) return [];
    return apiGet<JoinRequestDto[]>(`/api/circles/${circleId}/join-requests`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async approve(circleId: number, requestId: number): Promise<void> {
    if (!isApiMode()) return;
    await apiSend<unknown>(
      `/api/circles/${circleId}/join-requests/${requestId}/approve`,
      "POST",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async reject(circleId: number, requestId: number): Promise<void> {
    if (!isApiMode()) return;
    await apiSend<unknown>(
      `/api/circles/${circleId}/join-requests/${requestId}/reject`,
      "POST",
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },
};
