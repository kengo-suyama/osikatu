import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import type { ScheduleDto } from "@/lib/types";

type ScheduleParams = {
  from?: string;
  to?: string;
};

const normalizeId = (id: string) => Number(id.replace(/^us_/, ""));

export async function fetchMySchedules(params: ScheduleParams = {}): Promise<ScheduleDto[]> {
  if (!isApiMode()) {
    return [];
  }

  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const path = search.toString() ? `/api/me/schedules?${search.toString()}` : "/api/me/schedules";
  const data = await apiGet<{ items: ScheduleDto[] }>(path);
  return data.items;
}

export async function createMySchedule(payload: {
  title: string;
  startAt: string;
  endAt?: string | null;
  isAllDay?: boolean;
  note?: string | null;
  location?: string | null;
  remindAt?: string | null;
}): Promise<ScheduleDto> {
  if (!isApiMode()) {
    throw new Error("API mode required");
  }
  return apiSend<ScheduleDto>("/api/me/schedules", "POST", payload);
}

export async function updateMySchedule(id: string, payload: {
  title: string;
  startAt: string;
  endAt?: string | null;
  isAllDay?: boolean;
  note?: string | null;
  location?: string | null;
  remindAt?: string | null;
}): Promise<ScheduleDto> {
  if (!isApiMode()) {
    throw new Error("API mode required");
  }
  return apiSend<ScheduleDto>(`/api/me/schedules/${normalizeId(id)}`, "PUT", payload);
}

export async function deleteMySchedule(id: string): Promise<void> {
  if (!isApiMode()) {
    return;
  }
  await apiSend(`/api/me/schedules/${normalizeId(id)}`, "DELETE");
}
