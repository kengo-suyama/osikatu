import type { OwnerDashboardDto, PostDto } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";

export const circleOwnerRepo = {
  async getOwnerDashboard(circleId: number): Promise<OwnerDashboardDto> {
    return apiGet<OwnerDashboardDto>(`/api/circles/${circleId}/owner-dashboard`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },
  async remindAll(circleId: number): Promise<PostDto> {
    return apiSend<PostDto>(`/api/circles/${circleId}/owner-dashboard/remind`, "POST", null, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },
};
