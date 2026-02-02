import type {
  MemberBriefDto,
  SettlementDto,
  SettlementListDto,
  SettlementParticipantDto,
  SettlementTransferDto,
} from "@/lib/types";
import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { loadJson, saveJson } from "@/lib/storage";

const SETTLEMENTS_KEY = (circleId: number) => `osikatu:settlements:${circleId}`;
const MEMBERS_KEY = (circleId: number) => `osikatu:circle:${circleId}:members`;

const seedMembers = (circleId: number): MemberBriefDto[] => [
  {
    id: circleId * 100 + 1,
    userId: circleId * 1000 + 1,
    nickname: "Aoi",
    avatarUrl: null,
    initial: "A",
    role: "owner",
  },
  {
    id: circleId * 100 + 2,
    userId: circleId * 1000 + 2,
    nickname: "Miki",
    avatarUrl: null,
    initial: "M",
    role: "admin",
  },
  {
    id: circleId * 100 + 3,
    userId: circleId * 1000 + 3,
    nickname: "Ren",
    avatarUrl: null,
    initial: "R",
    role: "member",
  },
];

const ensureLocalMembers = (circleId: number): MemberBriefDto[] => {
  const stored = loadJson<MemberBriefDto[]>(MEMBERS_KEY(circleId));
  if (stored?.length) return stored;
  const seeded = seedMembers(circleId);
  saveJson(MEMBERS_KEY(circleId), seeded);
  return seeded;
};

const ensureLocalSettlements = (circleId: number): SettlementDto[] => {
  const stored = loadJson<SettlementDto[]>(SETTLEMENTS_KEY(circleId));
  if (stored) return stored;
  saveJson(SETTLEMENTS_KEY(circleId), []);
  return [];
};

const computeTransfers = (params: {
  settlementId: number;
  circleId: number;
  title: string;
  settledAt: string | null;
  amount: number;
  participantUserIds: number[];
  payerUserId: number;
}): SettlementDto => {
  const participantUserIds = Array.from(new Set(params.participantUserIds));
  if (!participantUserIds.includes(params.payerUserId)) {
    participantUserIds.push(params.payerUserId);
  }

  const participantCount = participantUserIds.length;
  const share = Math.ceil(params.amount / Math.max(1, participantCount));
  const diff = share * participantCount - params.amount;
  const payerShare = Math.max(0, share - diff);

  const participants: SettlementParticipantDto[] = participantUserIds.map(
    (userId, index) => ({
      id: params.settlementId * 100 + index + 1,
      userId,
      shareAmount: userId === params.payerUserId ? payerShare : share,
      isPayer: userId === params.payerUserId,
    })
  );

  const transfers: SettlementTransferDto[] = participantUserIds
    .filter((userId) => userId !== params.payerUserId)
    .map((userId, index) => ({
      id: params.settlementId * 1000 + index + 1,
      fromUserId: userId,
      toUserId: params.payerUserId,
      amount: share,
      status: "pending",
    }));

  return {
    id: params.settlementId,
    circleId: params.circleId,
    title: params.title,
    amount: params.amount,
    currency: "JPY",
    settledAt: params.settledAt,
    splitMode: "equal",
    participantCount,
    transferCount: transfers.length,
    createdByUserId: params.payerUserId,
    participants,
    transfers,
    createdAt: new Date().toISOString(),
  };
};

export const settlementRepo = {
  async list(circleId: number): Promise<SettlementListDto> {
    if (isApiMode()) {
      return apiGet<SettlementListDto>(`/api/circles/${circleId}/settlements`, {
        headers: { "X-Device-Id": getDeviceId() },
      });
    }

    return {
      items: ensureLocalSettlements(circleId),
      members: ensureLocalMembers(circleId),
    };
  },

  async get(circleId: number, settlementId: number): Promise<SettlementDto | null> {
    if (isApiMode()) {
      return apiGet<SettlementDto>(
        `/api/circles/${circleId}/settlements/${settlementId}`,
        { headers: { "X-Device-Id": getDeviceId() } }
      );
    }

    const list = ensureLocalSettlements(circleId);
    return list.find((item) => item.id === settlementId) ?? null;
  },

  async create(params: {
    circleId: number;
    title: string;
    settledAt: string | null;
    amount: number;
    participantUserIds: number[];
    payerUserId?: number;
  }): Promise<SettlementDto> {
    if (isApiMode()) {
      return apiSend<SettlementDto>(
        `/api/circles/${params.circleId}/settlements`,
        "POST",
        {
          title: params.title,
          amount: params.amount,
          participantUserIds: params.participantUserIds,
          splitMode: "equal",
          settledAt: params.settledAt,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    }

    const list = ensureLocalSettlements(params.circleId);
    const nextId = Math.max(0, ...list.map((item) => item.id)) + 1;
    const members = ensureLocalMembers(params.circleId);
    const payerUserId =
      params.payerUserId ??
      members.find((item) => item.role === "owner")?.userId ??
      members[0]?.userId ??
      nextId * 1000;

    const next = computeTransfers({
      settlementId: nextId,
      circleId: params.circleId,
      title: params.title,
      settledAt: params.settledAt,
      amount: params.amount,
      participantUserIds: params.participantUserIds,
      payerUserId,
    });

    const updated = [next, ...list];
    saveJson(SETTLEMENTS_KEY(params.circleId), updated);
    return next;
  },

  async markTransfersPaid(params: {
    circleId: number;
    settlementId: number;
    transferIds: number[];
  }): Promise<{ updated: boolean; paidTransferCount: number } | null> {
    if (isApiMode()) {
      return apiSend<{ updated: boolean; paidTransferCount: number }>(
        `/api/circles/${params.circleId}/settlements/${params.settlementId}`,
        "PATCH",
        { paidTransferIds: params.transferIds },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Device-Id": getDeviceId(),
          },
        }
      );
    }

    const list = ensureLocalSettlements(params.circleId);
    const target = list.find((item) => item.id === params.settlementId);
    if (!target || !target.transfers?.length) return null;

    const updatedTransfers = target.transfers.map((transfer) =>
      params.transferIds.includes(transfer.id)
        ? { ...transfer, status: "paid" }
        : transfer
    );

    const updatedTarget = { ...target, transfers: updatedTransfers };
    const updatedList = list.map((item) =>
      item.id === updatedTarget.id ? updatedTarget : item
    );
    saveJson(SETTLEMENTS_KEY(params.circleId), updatedList);
    return { updated: true, paidTransferCount: params.transferIds.length };
  },
};
