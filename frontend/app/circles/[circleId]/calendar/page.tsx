import Link from "next/link";

export default function CircleCalendarPage({
  params,
}: {
  params: { circleId: string };
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="text-lg font-semibold">みんなの予定（カレンダー）</div>
      <div className="mt-2 text-sm text-muted-foreground">
        カレンダー機能は準備中です。
      </div>
      <div className="mt-4">
        <Link href={`/circles/${params.circleId}`} className="text-sm underline">
          サークルHomeへ戻る
        </Link>
      </div>
    </div>
  );
}
