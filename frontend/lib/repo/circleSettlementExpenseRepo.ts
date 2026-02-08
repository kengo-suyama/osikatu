import { isApiMode } from "@/lib/config";
import { getDeviceId } from "@/lib/device";
import { apiGet } from "@/lib/repo/http";
import type {
  CircleSettlementBalancesDto,
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
};

