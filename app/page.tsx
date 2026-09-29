import { redirect } from "next/navigation";
import { HomeFeed } from "@/components/home-feed";
import {
  chips,
  exploreTopics,
  exploreVideos,
  videos,
  type Chip,
  type ExploreTopic,
  type LibraryView,
} from "@/lib/videos";

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
  return (
    <HomeFeed
      videos={[...videos, ...exploreVideos]}
      initialVideoId={initialVideoId}
      initialChip={(chips as readonly string[]).includes(chip ?? "") ? (chip as Chip) : "All"}
      initialExplore={(exploreTopics as readonly string[]).includes(explore ?? "") ? (explore as ExploreTopic) : null}
      initialLibrary={(libraries as readonly string[]).includes(library ?? "") ? (library as LibraryView) : "home"}
    />
  );
}
