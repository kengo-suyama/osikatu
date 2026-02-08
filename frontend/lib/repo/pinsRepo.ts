import type { CirclePinDto } from "@/lib/types";
import { apiGet } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { postRepo } from "@/lib/repo/postRepo";

export const pinsRepo = {
  async list(circleId: number): Promise<CirclePinDto[]> {
    return apiGet<CirclePinDto[]>(`/api/circles/${circleId}/pins`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  // Phase2: mutations are still post-backed; API projects into circle_pins.
  async create(circleId: number, body: string): Promise<void> {
    await postRepo.createPin(circleId, body);
  },

  async update(circleId: number, sourcePostId: string | number, body: string): Promise<void> {
    await postRepo.updatePin(circleId, sourcePostId, body);
  },

  async unpin(circleId: number, sourcePostId: string | number): Promise<void> {
    await postRepo.unpin(circleId, sourcePostId);
  },
};

