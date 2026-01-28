import ScheduleList from "@/components/schedule/ScheduleList";
import { apiFetch, API_BASE } from "@/lib/api";
import type { Schedule } from "@/lib/types";

const dummySchedule: Schedule[] = [
  { id: "1", title: "オンライン配信", date: "2026-02-02", place: "YouTube" },
  { id: "2", title: "コラボカフェ", date: "2026-02-10", place: "渋谷" },
  { id: "3", title: "握手会", date: "2026-02-15", place: "幕張" },
];

async function getSchedule(): Promise<Schedule[]> {
  if (!API_BASE) return dummySchedule;
  try {
    return await apiFetch<Schedule[]>("/schedule", { next: { revalidate: 120 } });
  } catch {
    return dummySchedule;
  }
}

export default async function SchedulePage() {
  const list = await getSchedule();

  return <ScheduleList list={list} />;
}
