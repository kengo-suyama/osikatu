import { isApiMode } from "@/lib/config";
import { apiGet } from "@/lib/repo/http";
import { localYearMonth } from "@/lib/date";
import type { ExpensesSummaryDto } from "@/lib/types";

export async function fetchExpensesSummary(params?: {
  yearMonth?: string;
}): Promise<ExpensesSummaryDto> {
  const month = params?.yearMonth ?? localYearMonth();

  if (!isApiMode()) {
    return { month, period: { start: "", end: "" }, totalAmount: 0, byOshi: [] };
  }

  return apiGet<ExpensesSummaryDto>(`/api/me/expenses-summary?month=${month}`);
}
