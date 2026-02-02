import CircleHomeScreen from "@/components/circle/CircleHomeScreen";

export default function CircleHomePage({
  params,
}: {
  params: { circleId: string };
}) {
  const circleId = Number(params.circleId);
  return <CircleHomeScreen circleId={circleId} />;
}
