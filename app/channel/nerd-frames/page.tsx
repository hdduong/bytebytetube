import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";
import { channelCatalog, loadLibrary } from "@/lib/library";

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadLibrary();
  const channel = data.profiles.find((profile) => profile.slug === "nerd-frames");
  return {
    title: "Nerd Frames - CinemaTube",
    description: channel?.bio ?? "Honest reviews, deep dives, and a love for great cinema.",
  };
}

export default async function NerdFramesPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialVideoId = typeof params.v === "string" ? params.v : null;
  const data = await loadLibrary();
  if (!data.profiles.some((profile) => profile.slug === "nerd-frames")) notFound();
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialVideoId={initialVideoId}
      initialChannel="nerd-frames"
    />
  );
}
