import CircleChatScreen from "@/components/chat/CircleChatScreen";

export default function CircleChatPage({ params }: { params: { circleId: string } }) {
  const circleId = Number(params.circleId);
  if (Number.isNaN(circleId)) {
    return <div className="p-6 text-sm">サークルが見つかりませんでした。</div>;
  }
  return <CircleChatScreen circleId={circleId} />;
}
