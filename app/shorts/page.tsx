import type { Metadata } from "next";
import { HomeFeed } from "@/components/home-feed";
import { channelCatalog, loadLibrary } from "@/lib/library";

export const metadata: Metadata = {
  title: "Shorts - CinemaTube",
  description: "One movie short at a time",
};

export default async function ShortsPage() {
  const data = await loadLibrary();
  return (
    <HomeFeed
      videos={channelCatalog(data)}
      profiles={data.profiles}
      commentsByVideoId={data.commentsByVideoId}
      subscribersByChannel={data.subscribersByChannel}
      likesByVideoId={data.likesByVideoId}
      initialLibrary="shorts"
    />
  );
}
