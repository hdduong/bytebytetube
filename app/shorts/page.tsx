import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { viewerLibrary } from "@/lib/likes";
import { channelCatalog, loadLibrary } from "@/lib/library";

export const metadata: Metadata = {
  title: "Shorts - CinemaTube",
  description: "One movie short at a time",
};

export default async function ShortsPage() {
  const [data, viewer] = await Promise.all([loadLibrary(), viewerLibrary()]);
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      initialLikedIds={viewer.likedIds}
      initialRecommendedIds={viewer.recommendedIds}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialLibrary="shorts"
    />
  );
}
