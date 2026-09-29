import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { channelShortCatalog, nerdFramesCatalog } from "@/lib/channel";
import { exploreVideos, videos } from "@/lib/videos";

const baseCatalog = [...videos, ...exploreVideos, ...nerdFramesCatalog()];
const catalog = [...baseCatalog, ...channelShortCatalog(baseCatalog)];

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
      videos={catalog}
      initialVideoId={initialVideoId}
      initialChannel="nerd-frames"
    />
  );
}
