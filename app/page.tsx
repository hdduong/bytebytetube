import { redirect } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";
import { viewerLibrary } from "@/lib/likes";
import { channelCatalog, loadLibrary } from "@/lib/library";
import { chips, exploreTopics, type Chip, type ExploreTopic, type LibraryView } from "@/lib/videos";

const libraries = ["shorts", "subscriptions", "watch-later", "liked"] as const;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    v?: string | string[];
    chip?: string | string[];
    explore?: string | string[];
    library?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const initialVideoId = one(params.v);
  const chip = one(params.chip);
  const explore = one(params.explore);
  const library = one(params.library);
  if (library === "shorts") redirect("/shorts");
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
      initialVideoId={initialVideoId}
      initialChip={(chips as readonly string[]).includes(chip ?? "") ? (chip as Chip) : "All"}
      initialExplore={(exploreTopics as readonly string[]).includes(explore ?? "") ? (explore as ExploreTopic) : null}
      initialLibrary={(libraries as readonly string[]).includes(library ?? "") ? (library as LibraryView) : "home"}
    />
  );
}
