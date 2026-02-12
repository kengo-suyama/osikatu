import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import type { MePointsResponseDto, PointsEarnReason, PointsEarnResponseDto, PointsHistoryResponseDto } from "@/lib/types";
import { getDeviceId } from "@/lib/device";

export const pointsRepo = {
  async getMePoints(): Promise<MePointsResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiGet<MePointsResponseDto>("/api/me/points", {
        headers: { "X-Device-Id": getDeviceId() },
      });
    } catch {
      return null;
    }
  },

  async getHistory(page = 1): Promise<PointsHistoryResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiGet<PointsHistoryResponseDto>(
        `/api/me/points/history?per_page=20&page=${page}`,
        { headers: { "X-Device-Id": getDeviceId() } }
      );
    } catch {
      return null;
    }
  },

  async earn(reason: PointsEarnReason): Promise<PointsEarnResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiSend<PointsEarnResponseDto>(
        "/api/me/points/earn",
        "POST",
        { reason },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    } catch {
      return null;
    }
  },
};

