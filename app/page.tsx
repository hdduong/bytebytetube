import { HomeFeed } from "@/components/home-feed";
import { exploreVideos, videos } from "@/lib/videos";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialVideoId = typeof params.v === "string" ? params.v : null;
  return (
    <HomeFeed videos={[...videos, ...exploreVideos]} initialVideoId={initialVideoId} />
  );
}
