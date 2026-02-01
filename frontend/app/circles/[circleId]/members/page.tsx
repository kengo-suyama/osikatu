import Link from "next/link";

export default function CircleMembersPage({
  params,
}: {
  params: { circleId: string };
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="text-lg font-semibold">メンバー</div>
      <div className="mt-2 text-sm text-muted-foreground">
        メンバー一覧は準備中です。
      </div>
      <div className="mt-4">
        <Link href={`/circles/${params.circleId}`} className="text-sm underline">
          サークルHomeへ戻る
        </Link>
      </div>
    </div>
  );
}
