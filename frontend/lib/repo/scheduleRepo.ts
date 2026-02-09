import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { loadJson, saveJson } from "@/lib/storage";
import type { ScheduleDto } from "@/lib/types";

type ScheduleParams = {
  from?: string;
  to?: string;
};

const normalizeId = (id: string) => Number(id.replace(/^us_/, ""));

const SCHEDULES_KEY = "osikatu:schedules";

const ensureLocalList = (): ScheduleDto[] => {
  const stored = loadJson<ScheduleDto[]>(SCHEDULES_KEY);
  return Array.isArray(stored) ? stored : [];
};

const persistLocalList = (items: ScheduleDto[]) => {
  saveJson(SCHEDULES_KEY, items);
};

const makeLocalId = () => `us_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function fetchMySchedules(params: ScheduleParams = {}): Promise<ScheduleDto[]> {
  if (!isApiMode()) {
    return ensureLocalList();
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
    const now = new Date().toISOString();
    const item: ScheduleDto = {
      id: makeLocalId(),
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt ?? null,
      isAllDay: payload.isAllDay ?? false,
      note: payload.note ?? null,
      location: payload.location ?? null,
      remindAt: payload.remindAt ?? null,
      updatedAt: now,
    };
    const list = ensureLocalList();
    const next = [...list, item];
    persistLocalList(next);
    return item;
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
    const list = ensureLocalList();
    const idx = list.findIndex((x) => String(x.id) === String(id));
    if (idx < 0) {
      throw new Error("Not found");
    }
    const updated: ScheduleDto = {
      ...list[idx],
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt ?? null,
      isAllDay: payload.isAllDay ?? false,
      note: payload.note ?? null,
      location: payload.location ?? null,
      remindAt: payload.remindAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    const next = [...list];
    next[idx] = updated;
    persistLocalList(next);
    return updated;
  }
  return apiSend<ScheduleDto>(`/api/me/schedules/${normalizeId(id)}`, "PUT", payload);
}

export async function deleteMySchedule(id: string): Promise<void> {
  if (!isApiMode()) {
    const list = ensureLocalList();
    persistLocalList(list.filter((x) => String(x.id) !== String(id)));
    return;
  }
  await apiSend(`/api/me/schedules/${normalizeId(id)}`, "DELETE");
}
