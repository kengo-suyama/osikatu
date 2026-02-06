import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { CircleAnnouncementDto, PostDto } from "@/lib/types";

export const chatRepo = {
  async list(circleId: number): Promise<PostDto[]> {
    return apiGet<PostDto[]>(`/api/circles/${circleId}/chat/messages`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async sendText(circleId: number, body: string): Promise<PostDto> {
    return apiSend<PostDto>(
      `/api/circles/${circleId}/chat/messages`,
      "POST",
      { body, messageType: "text" },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async sendStamp(circleId: number, stampId: string): Promise<PostDto> {
    return apiSend<PostDto>(
      `/api/circles/${circleId}/chat/messages`,
      "POST",
      { messageType: "stamp", stampId },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async sendMedia(circleId: number, file: File): Promise<PostDto> {
    const form = new FormData();
    form.append("file", file);
    return apiSend<PostDto>(`/api/circles/${circleId}/chat/messages`, "POST", form, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async getAnnouncement(circleId: number): Promise<CircleAnnouncementDto> {
    return apiGet<CircleAnnouncementDto>(`/api/circles/${circleId}/announcement`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async updateAnnouncement(circleId: number, text: string): Promise<CircleAnnouncementDto> {
    return apiSend<CircleAnnouncementDto>(
      `/api/circles/${circleId}/announcement`,
      "PUT",
      { text },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async deleteAnnouncement(circleId: number): Promise<{ deleted: boolean }> {
    return apiSend<{ deleted: boolean }>(
      `/api/circles/${circleId}/announcement`,
      "DELETE",
      undefined,
      {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },
};
