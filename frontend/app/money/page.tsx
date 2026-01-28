import MoneyView from "@/components/money/MoneyView";
import { apiFetch, API_BASE } from "@/lib/api";
import type { MoneySummary } from "@/lib/types";

const dummyMoney: MoneySummary = {
  items: [
    { id: "1", title: "グッズ", amount: 3200, date: "2026-01-27" },
    { id: "2", title: "配信チケット", amount: 1500, date: "2026-01-25" },
    { id: "3", title: "カフェ", amount: 980, date: "2026-01-24" },
  ],
  chart: [1200, 500, 3000, 1800, 2200, 900, 1600],
};

async function getMoney(): Promise<MoneySummary> {
  if (!API_BASE) return dummyMoney;
  try {
    return await apiFetch<MoneySummary>("/money/summary", { next: { revalidate: 120 } });
  } catch {
    return dummyMoney;
  }
}

export default async function MoneyPage() {
  const data = await getMoney();

  return <MoneyView data={data} />;
}
