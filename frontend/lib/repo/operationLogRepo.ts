import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { OperationLogListDto } from "@/lib/types";

type ListParams = {
  limit?: number;
  cursor?: string | null;
  from?: string | null;
  to?: string | null;
  actionPrefix?: string | null;
};

const buildQuery = (params: ListParams) => {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.actionPrefix) search.set("actionPrefix", params.actionPrefix);
  const query = search.toString();
  return query ? `?${query}` : "";
};

export async function listMyLogs(params: ListParams = {}): Promise<OperationLogListDto> {
  if (!isApiMode()) {
    return { items: [], nextCursor: null };
  }

  const query = buildQuery(params);
  return apiGet<OperationLogListDto>(`/api/me/logs${query}`, {
    headers: { "X-Device-Id": getDeviceId() },
  });
}

export async function deleteMeLog(logId: string): Promise<void> {
  if (!isApiMode()) {
    return;
  }

  await apiSend(`/api/me/logs/${encodeURIComponent(logId)}`, "DELETE");
}

export async function deleteCircleLog(
  circleId: string | number,
  logId: string
): Promise<void> {
  if (!isApiMode()) {
    return;
  }

  await apiSend(
    `/api/circles/${circleId}/logs/${encodeURIComponent(logId)}`,
    "DELETE"
  );
}

export async function listCircleLogs(
  circleId: string | number,
  params: ListParams = {}
): Promise<OperationLogListDto> {
  if (!isApiMode()) {
    return { items: [], nextCursor: null };
  }

  const query = buildQuery(params);
  return apiGet<OperationLogListDto>(`/api/circles/${circleId}/logs${query}`, {
    headers: { "X-Device-Id": getDeviceId() },
  });
}
