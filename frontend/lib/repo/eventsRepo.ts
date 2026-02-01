import { apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { AnalyticsEventName } from "@/lib/events";

const normalizeScreen = (screen?: string | null): string => {
  if (!screen) {
    if (typeof window !== "undefined") {
      return window.location.pathname || "/";
    }
    return "/";
  }
  const trimmed = screen.split("?")[0].split("#")[0];
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
};

export const eventsRepo = {
  async track(
    eventName: AnalyticsEventName,
    screen?: string,
    circleId?: number,
    meta?: Record<string, unknown>
  ): Promise<void> {
    const payload = {
      eventName,
      screen: normalizeScreen(screen),
      circleId,
      meta,
    };

    try {
      await apiSend<null>("/api/events", "POST", payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getDeviceId(),
        },
      });
    } catch {
      // Ignore tracking errors to avoid blocking UI.
    }
  },
};
