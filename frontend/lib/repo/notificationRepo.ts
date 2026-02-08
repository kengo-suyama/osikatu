import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { NotificationDto, NotificationsResponse } from "@/lib/types";

export async function fetchNotifications(params?: {
  cursor?: string | null;
  limit?: number;
  onlyUnread?: boolean;
}): Promise<NotificationsResponse | null> {
  if (!isApiMode()) {
    return { items: [], nextCursor: null };
  }

  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.onlyUnread) query.set("unread", "1");
  const suffix = query.toString();

  try {
    return await apiGet<NotificationsResponse>(
      `/api/me/notifications${suffix ? `?${suffix}` : ""}`,
      { headers: { "X-Device-Id": getDeviceId() } }
    );
  } catch {
    return null;
  }
}

export async function markNotificationRead(
  id: string
): Promise<NotificationDto | null> {
  if (!isApiMode()) {
    return null;
  }

  try {
    return await apiSend<NotificationDto>(
      `/api/me/notifications/${id}/read`,
      "POST",
      undefined,
      { headers: { "X-Device-Id": getDeviceId() } }
    );
  } catch {
    return null;
  }
}

export async function markAllNotificationsRead(): Promise<{ markedCount: number } | null> {
  if (!isApiMode()) return null;
  try {
    return await apiSend<{ markedCount: number }>(
      "/api/me/notifications/read-all",
      "POST",
      undefined,
      { headers: { "X-Device-Id": getDeviceId() } }
    );
  } catch {
    return null;
  }
}
