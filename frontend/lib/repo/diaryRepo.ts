import { isApiMode } from "@/lib/config";
import { apiGet, apiSend, ApiRequestError } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { DiaryDto } from "@/lib/types";

export async function listDiaries(): Promise<DiaryDto[]> {
  if (!isApiMode()) {
    return [];
  }

  return apiGet<DiaryDto[]>("/api/me/diaries", {
    headers: { "X-Device-Id": getDeviceId() },
  });
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
