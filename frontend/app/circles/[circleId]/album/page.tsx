import CircleAlbumScreen from "@/components/album/CircleAlbumScreen";

export default function CircleAlbumPage({ params }: { params: { circleId: string } }) {
  const circleId = Number(params.circleId);
  if (Number.isNaN(circleId)) {
    return <div className="p-6 text-sm">サークルが見つかりませんでした。</div>;
  }
  return <CircleAlbumScreen circleId={circleId} />;
}
