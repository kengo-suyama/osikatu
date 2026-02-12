import { apiGet, apiSend } from "@/lib/repo/http";
import { getDeviceId } from "@/lib/device";
import { isApiMode } from "@/lib/config";

export type MoneyEntry = {
  id: number;
  date: string;
  type: "income" | "expense";
  amountJpy: number;
  category: string | null;
  note: string | null;
  createdAt: string | null;
};

type MoneyListResponse = MoneyEntry[];

const headers = () => ({ "X-Device-Id": getDeviceId() });

export async function fetchMoneyEntries(
  from?: string,
  to?: string,
): Promise<MoneyEntry[]> {
  if (!isApiMode()) return [];
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("limit", "200");
  return apiGet<MoneyListResponse>(`/api/me/money?${params}`, {
    headers: headers(),
  });
}

export async function createMoneyEntry(data: {
  date: string;
  type: "income" | "expense";
  amount_jpy: number;
  category?: string;
  note?: string;
}): Promise<MoneyEntry> {
  return apiSend<MoneyEntry>("/api/me/money", "POST", data, {
    headers: headers(),
  });
}

export async function deleteMoneyEntry(id: number): Promise<void> {
  await apiSend<null>(`/api/me/money/${id}`, "DELETE", undefined, {
    headers: headers(),
  });
}
