import type { PostDto } from "@/lib/types";
import { ApiRequestError, apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";

export const postRepo = {
  async list(circleId: number): Promise<PostDto[]> {
    return apiGet<PostDto[]>(`/api/circles/${circleId}/posts`, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async create(circleId: number, body: string, tags: string[] = []): Promise<PostDto> {
    return apiSend<PostDto>(`/api/circles/${circleId}/posts`, "POST", { body, tags }, {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async listChat(circleId: number): Promise<PostDto[]> {
    try {
      return await apiGet<PostDto[]>(`/api/circles/${circleId}/chat/messages`, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status !== 404) {
        throw err;
      }
      return apiGet<PostDto[]>(`/api/circles/${circleId}/posts?type=chat`, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    }
  },

  async sendChat(circleId: number, body: string, file?: File): Promise<PostDto> {
    if (file) {
      const form = new FormData();
      form.append("body", body);
      form.append("image", file);
      return apiSend<PostDto>(`/api/circles/${circleId}/chat/messages`, "POST", form, {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      });
    }

    try {
      return await apiSend<PostDto>(
        `/api/circles/${circleId}/chat/messages`,
        "POST",
        { body },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.status !== 404) {
        throw err;
      }
      return apiSend<PostDto>(
        `/api/circles/${circleId}/posts`,
        "POST",
        { body, postType: "chat" },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    }
  },

  async uploadMedia(postId: number, file: File): Promise<PostDto> {
    const form = new FormData();
    form.append("file", file);
    return apiSend<PostDto>(`/api/posts/${postId}/media`, "POST", form, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async markChatRead(circleId: number, lastReadAt?: string): Promise<void> {
    try {
      await apiSend<unknown>(
        `/api/circles/${circleId}/chat/read`,
        "POST",
        lastReadAt ? { lastReadAt } : {},
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    } catch {
      // ignore read tracking failures
    }
  },

  async like(postId: number): Promise<void> {
    await apiSend<unknown>(`/api/posts/${postId}/like`, "POST", undefined, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },

  async unlike(postId: number): Promise<void> {
    await apiSend<unknown>(`/api/posts/${postId}/like`, "DELETE", undefined, {
      headers: {
        "X-Device-Id": getDeviceId(),
      },
    });
  },
};
