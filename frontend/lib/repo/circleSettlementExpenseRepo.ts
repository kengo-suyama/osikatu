import { isApiMode } from "@/lib/config";
import { getDeviceId } from "@/lib/device";
import { apiGet, apiSend } from "@/lib/repo/http";
import type {
  CircleSettlementBalancesDto,
  CircleSettlementExpenseDto,
  CircleSettlementExpenseListDto,
  CircleSettlementSuggestionsDto,
} from "@/lib/types";

export const circleSettlementExpenseRepo = {
  async list(circleId: number): Promise<CircleSettlementExpenseListDto> {
    if (!isApiMode()) return { items: [], nextCursor: null };
    return apiGet<CircleSettlementExpenseListDto>(
      `/api/circles/${circleId}/settlements/expenses`,
      {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async balances(circleId: number): Promise<CircleSettlementBalancesDto> {
    if (!isApiMode()) {
      return { items: [], totals: { totalExpensesYen: 0, expenseCount: 0 } };
    }
    return apiGet<CircleSettlementBalancesDto>(
      `/api/circles/${circleId}/settlements/balances`,
      {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },

  async suggestions(circleId: number): Promise<CircleSettlementSuggestionsDto> {
    if (!isApiMode()) {
      return { items: [], generatedAt: new Date().toISOString() };
    }
    return apiGet<CircleSettlementSuggestionsDto>(
      `/api/circles/${circleId}/settlements/suggestions`,
      {
        headers: {
          "X-Device-Id": getDeviceId(),
        },
      }
    );
  },
  async create(
    circleId: number,
    params: {
      title: string;
      amountYen: number;
      splitType: "equal" | "fixed";
      payerMemberId: number;
      occurredOn?: string;
      participants?: number[];
      shares?: { memberId: number; shareYen: number }[];
    }
  ): Promise<{ expense: CircleSettlementExpenseDto }> {
    return apiSend<{ expense: CircleSettlementExpenseDto }>(
      `/api/circles/${circleId}/settlements/expenses`,
      "POST",
      params,
      { headers: { "X-Device-Id": getDeviceId() } }
    );
  },

  async voidExpense(
    circleId: number,
    expenseId: number
  ): Promise<{ voided: CircleSettlementExpenseDto }> {
    return apiSend<{ voided: CircleSettlementExpenseDto }>(
      `/api/circles/${circleId}/settlements/expenses/${expenseId}/void`,
      "POST",
      {},
      { headers: { "X-Device-Id": getDeviceId() } }
    );
  },
};

