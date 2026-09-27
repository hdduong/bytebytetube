import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";
import { getChannel, nerdFramesCatalog } from "@/lib/channel";
import { exploreVideos, videos } from "@/lib/videos";

const catalog = [...videos, ...exploreVideos, ...nerdFramesCatalog()];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const channel = getChannel(slug, catalog);
  if (!channel) return { title: "CinemaTube" };
  return {
    title: `${channel.name} - CinemaTube`,
    description: channel.bio,
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const { slug } = await params;
  const channel = getChannel(slug, catalog);
  if (!channel) notFound();
  const query = await searchParams;
  const initialVideoId = typeof query.v === "string" ? query.v : null;
  return (
    <HomeFeed
      videos={catalog}
      initialVideoId={initialVideoId}
      initialChannel={slug}
    />
  );
}
