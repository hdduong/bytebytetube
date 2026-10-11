import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { viewerLikes } from "@/lib/likes";
import { channelCatalog, loadLibrary } from "@/lib/library";

export const metadata: Metadata = {
  title: "Shorts - CinemaTube",
  description: "One movie short at a time",
};

export default async function ShortsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialShortId = typeof params.v === "string" ? params.v : null;
  const [data, viewer] = await Promise.all([loadLibrary(), viewerLikes()]);
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      initialLikedIds={viewer.likedIds}
      initialViewerId={viewer.userId}
      initialShortId={initialShortId}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialLibrary="shorts"
    />
  );
}
