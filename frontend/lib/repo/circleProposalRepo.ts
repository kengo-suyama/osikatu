import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { ScheduleProposalDto, ScheduleProposalListDto } from "@/lib/types";

const headers = () => ({
  "Content-Type": "application/json",
  "X-Device-Id": getDeviceId(),
});

export async function createProposal(
  circleId: number,
  payload: {
    title: string;
    startAt: string;
    endAt?: string;
    isAllDay?: boolean;
    note?: string | null;
    location?: string | null;
  },
): Promise<{ proposal: ScheduleProposalDto }> {
  return apiSend<{ proposal: ScheduleProposalDto }>(
    `/api/circles/${circleId}/schedule-proposals`,
    "POST",
    payload,
    { headers: headers() },
  );
}

export async function listMyProposals(
  circleId: number,
  status?: string,
): Promise<ScheduleProposalListDto> {
  const query = status ? `?status=${status}` : "";
  return apiGet<ScheduleProposalListDto>(
    `/api/circles/${circleId}/schedule-proposals/mine${query}`,
    { headers: { "X-Device-Id": getDeviceId() } },
  );
}

export async function listProposals(
  circleId: number,
  status?: string,
): Promise<ScheduleProposalListDto> {
  const query = status ? `?status=${status}` : "";
  return apiGet<ScheduleProposalListDto>(
    `/api/circles/${circleId}/schedule-proposals${query}`,
    { headers: { "X-Device-Id": getDeviceId() } },
  );
}

export async function approveProposal(
  circleId: number,
  proposalId: number,
  comment?: string,
): Promise<{ proposal: ScheduleProposalDto; schedule: { id: string; title: string } }> {
  return apiSend(
    `/api/circles/${circleId}/schedule-proposals/${proposalId}/approve`,
    "POST",
    comment ? { comment } : {},
    { headers: headers() },
  );
}

export async function rejectProposal(
  circleId: number,
  proposalId: number,
  comment?: string,
): Promise<{ proposal: ScheduleProposalDto }> {
  return apiSend(
    `/api/circles/${circleId}/schedule-proposals/${proposalId}/reject`,
    "POST",
    comment ? { comment } : {},
    { headers: headers() },
  );
}
