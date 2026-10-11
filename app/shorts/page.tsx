import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { viewerLikes } from "@/lib/likes";
import { channelCatalog, loadLibrary } from "@/lib/library";

export const metadata: Metadata = {
  title: "Shorts - CinemaTube",
  description: "One movie short at a time",
};

export default async function ShortsPage() {
  const [data, likedIds] = await Promise.all([loadLibrary(), viewerLikes()]);
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      initialLikedIds={likedIds}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialLibrary="shorts"
    />
  );
}
