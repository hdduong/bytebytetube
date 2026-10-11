import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";
import { viewerLibrary } from "@/lib/likes";
import { channelCatalog, loadLibrary } from "@/lib/library";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadLibrary();
  const channel = data.profiles.find((profile) => profile.slug === slug);
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
  const [data, viewer] = await Promise.all([loadLibrary(), viewerLibrary()]);
  const channel = data.profiles.find((profile) => profile.slug === slug);
  if (!channel) notFound();
  const query = await searchParams;
  const initialVideoId = typeof query.v === "string" ? query.v : null;
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialLikedIds={viewer.likedIds}
      initialRecommendedIds={viewer.recommendedIds}
      initialVideoId={initialVideoId}
      initialChannel={slug}
    />
  );
}
