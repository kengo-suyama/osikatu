import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import type { MePointsResponseDto, PointsEarnReason, PointsEarnResponseDto } from "@/lib/types";
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
  async awardShare(): Promise<PointsEarnResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiSend<PointsEarnResponseDto>(
        "/api/me/points/award-share",
        "POST",
        {},
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

