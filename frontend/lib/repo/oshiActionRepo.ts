import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { OshiActionCompleteDto, OshiActionTodayDto, TitlesResponseDto } from "@/lib/types";

export const oshiActionRepo = {
  async getToday(): Promise<OshiActionTodayDto | null> {
    if (!isApiMode()) return null;
    return apiGet<OshiActionTodayDto>("/api/me/oshi-actions/today", {
      headers: { "X-Device-Id": getDeviceId() },
    });
  },

  async complete(dateKey: string): Promise<OshiActionCompleteDto> {
    return apiSend<OshiActionCompleteDto>(
      "/api/me/oshi-actions/complete",
      "POST",
      { dateKey },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async getTitles(): Promise<TitlesResponseDto | null> {
    if (!isApiMode()) return null;
    return apiGet<TitlesResponseDto>("/api/me/titles", {
      headers: { "X-Device-Id": getDeviceId() },
    });
  },
};
