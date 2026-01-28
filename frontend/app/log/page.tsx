import LogList from "@/components/log/LogList";
import { apiFetch, API_BASE } from "@/lib/api";
import type { Log } from "@/lib/types";

const dummyLogs: Log[] = [
  { id: "1", title: "配信視聴", note: "アーカイブ視聴", date: "2026-01-28" },
  { id: "2", title: "SNS巡回", note: "切り抜きチェック", date: "2026-01-27" },
  { id: "3", title: "グッズ整理", note: "アクスタ掃除", date: "2026-01-26" },
];

async function getLogs(): Promise<Log[]> {
  if (!API_BASE) return dummyLogs;
  try {
    return await apiFetch<Log[]>("/logs", { next: { revalidate: 60 } });
  } catch {
    return dummyLogs;
  }
}

export default async function LogPage() {
  const logs = await getLogs();

  return <LogList logs={logs} />;
}
