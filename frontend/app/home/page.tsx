import HomeView from "@/components/home/HomeView";
import { apiFetch, API_BASE } from "@/lib/api";
import type { HomeSummary } from "@/lib/types";

const dummyData: HomeSummary = {
  todayTime: "2.5h",
  todaySpend: "\1,800",
  logs: [
    {
      id: "1",
      title: "配信視聴",
      note: "アーカイブ視聴",
      date: "2026-01-28",
      time: "21:00",
    },
    {
      id: "2",
      title: "SNSチェック",
      note: "切り抜き確認",
      date: "2026-01-28",
      time: "22:10",
    },
    {
      id: "3",
      title: "グッズ整理",
      note: "アクスタ掃除",
      date: "2026-01-28",
      time: "23:00",
    },
  ],
};

async function getHomeData(): Promise<HomeSummary> {
  if (!API_BASE) return dummyData;
  try {
    return await apiFetch<HomeSummary>("/home/summary", { next: { revalidate: 60 } });
  } catch {
    return dummyData;
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  return <HomeView data={data} />;
}
