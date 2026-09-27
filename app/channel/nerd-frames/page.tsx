import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { exploreVideos, videos } from "@/lib/videos";

export const metadata: Metadata = {
  title: "Nerd Frames - CinemaTube",
  description: "Honest reviews, deep dives, and a love for great cinema.",
};

export default async function NerdFramesPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialVideoId = typeof params.v === "string" ? params.v : null;
  return (
    <HomeFeed
      videos={[...videos, ...exploreVideos]}
      initialVideoId={initialVideoId}
      initialChannel="nerd-frames"
    />
  );
}
