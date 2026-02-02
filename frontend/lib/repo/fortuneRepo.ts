import { API_BASE_URL, isApiMode } from "@/lib/config";
import { getDeviceId } from "@/lib/device";
import { ApiRequestError } from "@/lib/repo/http";
import type { FortuneDto } from "@/lib/types";

const stripBom = (text: string) => text.replace(/^\uFEFF/, "");

const parseJson = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(stripBom(text));
  } catch {
    return null;
  }
};

export async function fetchTodayFortune(date?: string): Promise<FortuneDto | null> {
  if (!isApiMode()) {
    return null;
  }

  try {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/me/fortune/today${query}`, {
      cache: "no-store",
      headers: { "X-Device-Id": getDeviceId() },
    });
    const text = await res.text().catch(() => "");
    const json = parseJson(text);

    if (!res.ok) {
      if (json && json.error) {
        console.warn("Fortune API error", json.error);
        return null;
      }
      console.warn("Fortune API HTTP error", res.status);
      return null;
    }

    if (!json || !json.success || !json.success.data) {
      console.warn("Fortune API wrong envelope");
      return null;
    }

    return json.success.data as FortuneDto;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      console.warn("Fortune API request error", error.code, error.message);
      return null;
    }
    console.warn("Fortune API unexpected", error);
    return null;
  }
}

export async function fetchFortuneHistory(params?: {
  from?: string;
  to?: string;
}): Promise<FortuneDto[]> {
  if (!isApiMode()) {
    return [];
  }

  try {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    const query = search.toString() ? `?${search.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/me/fortune/history${query}`, {
      cache: "no-store",
      headers: { "X-Device-Id": getDeviceId() },
    });
    const text = await res.text().catch(() => "");
    const json = parseJson(text);

    if (!res.ok) {
      if (json && json.error) {
        console.warn("Fortune history API error", json.error);
        return [];
      }
      console.warn("Fortune history API HTTP error", res.status);
      return [];
    }

    if (!json || !json.success || !json.success.data) {
      console.warn("Fortune history API wrong envelope");
      return [];
    }

    const items = json.success.data.items;
    if (!Array.isArray(items)) {
      console.warn("Fortune history API items missing");
      return [];
    }

    return items as FortuneDto[];
  } catch (error) {
    if (error instanceof ApiRequestError) {
      console.warn("Fortune history API request error", error.code, error.message);
      return [];
    }
    console.warn("Fortune history API unexpected", error);
    return [];
  }
}
