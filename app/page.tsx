import { HomeFeed } from "@/components/home-feed";
import { exploreVideos, videos } from "@/lib/videos";

export default function Home() {
  return <HomeFeed videos={[...videos, ...exploreVideos]} />;
}
