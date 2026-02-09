import { isApiMode } from "@/lib/config";
import { apiGet } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { GachaHistoryResponseDto } from "@/lib/types";

export const gachaRepo = {
  async getHistory(page = 1): Promise<GachaHistoryResponseDto | null> {
    if (!isApiMode()) return null;
    try {
      return await apiGet<GachaHistoryResponseDto>(
        `/api/me/gacha/history?per_page=20&page=${page}`,
        { headers: { "X-Device-Id": getDeviceId() } }
      );
    } catch {
      return null;
    }
  },
};
