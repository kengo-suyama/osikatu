import type { CirclePinDto } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";

export const pinsRepo = {
  async list(circleId: number): Promise<CirclePinDto[]> {
    return apiGet<CirclePinDto[]>(`/api/circles/${circleId}/pins`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async create(circleId: number, body: string): Promise<CirclePinDto> {
    return apiSend<CirclePinDto>(`/api/circles/${circleId}/pins-v2`, "POST", { body }, {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async update(circleId: number, pinId: string | number, body: string): Promise<CirclePinDto> {
    return apiSend<CirclePinDto>(
      `/api/circles/${circleId}/pins-v2/${encodeURIComponent(String(pinId))}`,
      "PATCH",
      { body },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async unpin(circleId: number, pinId: string | number): Promise<{ unpinned: boolean }> {
    return apiSend<{ unpinned: boolean }>(
      `/api/circles/${circleId}/pins-v2/${encodeURIComponent(String(pinId))}/unpin`,
      "POST",
      undefined,
      {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },
};
