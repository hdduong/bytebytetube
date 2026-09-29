import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { exploreVideos, videos } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Shorts - CinemaTube",
  description: "One movie short at a time",
};

export default function ShortsPage() {
  return <HomeFeed videos={[...videos, ...exploreVideos]} initialLibrary="shorts" />;
}
