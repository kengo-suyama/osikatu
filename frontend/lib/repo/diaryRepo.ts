import { isApiMode } from "@/lib/config";
import { apiGet, apiSend, ApiRequestError } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { DiaryDto } from "@/lib/types";

export interface DiaryFilters {
  q?: string;
  tag?: string;
}

export async function listDiaries(filters?: DiaryFilters): Promise<DiaryDto[]> {
  if (!isApiMode()) {
    return [];
  }

  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  const path = `/api/me/diaries${qs ? `?${qs}` : ""}`;

  return apiGet<DiaryDto[]>(path, {
    headers: { "X-Device-Id": getDeviceId() },
  });
}

export async function createDiary(data: {
  oshiId: number;
  title: string;
  content: string;
  diaryDate: string;
  tags?: string[];
  images?: File[];
}): Promise<DiaryDto> {
  const fd = new FormData();
  fd.append("oshiId", String(data.oshiId));
  fd.append("title", data.title);
  fd.append("content", data.content);
  fd.append("diaryDate", data.diaryDate);
  if (data.tags) {
    for (const t of data.tags) {
      fd.append("tags[]", t);
    }
  }
  if (data.images) {
    for (const f of data.images) {
      fd.append("images[]", f);
    }
  }
  return apiSend<DiaryDto>("/api/me/diaries", "POST", fd);
}

export async function deleteDiary(
  diaryId: number
): Promise<"ok" | "not_found"> {
  if (!isApiMode()) {
    return "ok";
  }

  try {
    await apiSend<null>(`/api/me/diaries/${diaryId}`, "DELETE", undefined, {
      headers: { "X-Device-Id": getDeviceId() },
    });
    return "ok";
  } catch (err: unknown) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return "not_found";
    }
    throw err;
  }
}
