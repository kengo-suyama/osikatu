import CirclePinsScreen from "@/components/circle/CirclePinsScreen";

export default function CirclePinsPage({
  params,
}: {
  params: { circleId: string };
}) {
  const circleId = Number(params.circleId);
  return <CirclePinsScreen circleId={circleId} />;
}
