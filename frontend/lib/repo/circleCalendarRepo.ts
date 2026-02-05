import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { loadJson, saveJson } from "@/lib/storage";
import type {
  CircleScheduleCreateRequest,
  CircleScheduleDto,
  CircleScheduleListDto,
} from "@/lib/types";

const STORAGE_KEY = (circleId: number) => `osikatu:circle:${circleId}:calendar`;

const ensureLocalSchedules = (circleId: number): CircleScheduleDto[] => {
  const stored = loadJson<CircleScheduleDto[]>(STORAGE_KEY(circleId));
  if (stored) return stored;
  saveJson(STORAGE_KEY(circleId), []);
  return [];
};

export async function listCircleSchedules(
  circleId: number,
  params?: { from?: string; to?: string }
): Promise<CircleScheduleListDto> {
  if (!isApiMode()) {
    return { items: ensureLocalSchedules(circleId) };
  }

  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const suffix = query.toString();

  return apiGet<CircleScheduleListDto>(
    `/api/circles/${circleId}/calendar${suffix ? `?${suffix}` : ""}`,
    { headers: { "X-Device-Id": getDeviceId() } }
  );
}

export async function createCircleSchedule(
  circleId: number,
  payload: CircleScheduleCreateRequest
): Promise<CircleScheduleDto> {
  if (!isApiMode()) {
    const list = ensureLocalSchedules(circleId);
    const nextId =
      Math.max(0, ...list.map((item) => Number(item.id.replace("cs_", "")))) + 1;
    const next: CircleScheduleDto = {
      id: `cs_${nextId}`,
      circleId,
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt ?? payload.startAt,
      isAllDay: Boolean(payload.isAllDay),
      note: payload.note ?? null,
      location: payload.location ?? null,
      participants: [],
      updatedAt: new Date().toISOString(),
    };
    const updated = [next, ...list];
    saveJson(STORAGE_KEY(circleId), updated);
    return next;
  }

  return apiSend<CircleScheduleDto>(
    `/api/circles/${circleId}/calendar`,
    "POST",
    {
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt ?? payload.startAt,
      isAllDay: payload.isAllDay ?? false,
      note: payload.note ?? null,
      location: payload.location ?? null,
      participantUserIds: payload.participantUserIds,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": getDeviceId(),
      },
    }
  );
}

export async function deleteCircleSchedule(
  circleId: number,
  scheduleId: string
): Promise<{ deleted: boolean }> {
  if (!isApiMode()) {
    const list = ensureLocalSchedules(circleId);
    const next = list.filter((item) => item.id !== scheduleId);
    saveJson(STORAGE_KEY(circleId), next);
    return { deleted: true };
  }

  return apiSend<{ deleted: boolean }>(
    `/api/circles/${circleId}/calendar/${scheduleId}`,
    "DELETE",
    undefined,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": getDeviceId(),
      },
    }
  );
}

export async function updateCircleSchedule(
  circleId: number,
  scheduleId: string,
  payload: CircleScheduleCreateRequest
): Promise<CircleScheduleDto> {
  if (!isApiMode()) {
    const list = ensureLocalSchedules(circleId);
    const next = list.map((item) =>
      item.id === scheduleId
        ? {
            ...item,
            title: payload.title,
            startAt: payload.startAt,
            endAt: payload.endAt ?? payload.startAt,
            isAllDay: Boolean(payload.isAllDay),
            note: payload.note ?? null,
            location: payload.location ?? null,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    saveJson(STORAGE_KEY(circleId), next);
    const updated = next.find((item) => item.id === scheduleId);
    if (!updated) throw new Error("schedule not found");
    return updated;
  }

  return apiSend<CircleScheduleDto>(
    `/api/circles/${circleId}/calendar/${scheduleId}`,
    "PUT",
    {
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt ?? payload.startAt,
      isAllDay: payload.isAllDay ?? false,
      note: payload.note ?? null,
      location: payload.location ?? null,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": getDeviceId(),
      },
    }
  );
}
