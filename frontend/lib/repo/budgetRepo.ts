import { isApiMode } from "@/lib/config";
import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import type { BudgetDto } from "@/lib/types";
import { localYearMonth } from "@/lib/date";

const DEFAULT_MONTH = () => localYearMonth();

export type BudgetResponse = {
  budget: number;
  spent: number;
  yearMonth: string;
  updatedAt: string | null;
};

const mapDtoToResponse = (dto: BudgetDto | null | undefined): BudgetResponse => ({
  budget: dto?.budget ?? 0,
  spent: dto?.spent ?? 0,
  yearMonth: dto?.yearMonth ?? DEFAULT_MONTH(),
  updatedAt: dto?.updatedAt ?? null,
});

export async function fetchBudget(): Promise<BudgetResponse> {
  if (!isApiMode()) {
    return mapDtoToResponse(null);
  }

  try {
    const dto = await apiGet<BudgetDto>(`/api/me/budget`, {
      headers: { "X-Device-Id": getDeviceId() },
    });
    return mapDtoToResponse(dto);
  } catch (error: any) {
    const status = error?.status ?? error?.statusCode;
    if (status === 404) {
      return mapDtoToResponse(null);
    }
    throw error;
  }
}

export async function updateBudget(
  payload: BudgetResponse
): Promise<BudgetResponse> {
  if (!isApiMode()) {
    return mapDtoToResponse({
      yearMonth: payload.yearMonth,
      budget: payload.budget,
      spent: payload.spent,
      updatedAt: payload.updatedAt,
    });
  }

  const dto = await apiSend<BudgetDto>(
    "/api/me/budget",
    "PUT",
    {
      yearMonth: payload.yearMonth,
      budget: payload.budget,
    },
    {
      headers: { "X-Device-Id": getDeviceId() },
    }
  );
  return mapDtoToResponse(dto);
}
