"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChannelView } from "@/components/channel-view";
import { channelSlug, type ChannelProfile } from "@/lib/channel";
import { ChevronRightIcon } from "@/components/icons";
import { Header } from "@/components/header";
import { useLayoutMode } from "@/components/phone-layout";
import { ShortsFeed } from "@/components/shorts-feed";
import { Sidebar } from "@/components/sidebar";
import { VideoGrid } from "@/components/video-card";
import { WatchView } from "@/components/watch-view";
import { cn } from "@/lib/cn";
import type { Comment } from "@/lib/watch";
import {
  chips,
  isGenre,
  matchesChip,
  matchesQuery,
  type Chip,
  type ExploreTopic,
  type Genre,
  type LibraryView,
  type Video,
} from "@/lib/videos";

const headings: Record<Chip, { title: string; subtitle: string }> = {
  All: {
    title: "Your next movie starts here",
    subtitle: "Fresh reviews from creators you love",
  },
  Horror: {
    title: "Horror",
    subtitle: "The reviews that get under your skin",
  },
  Action: {
    title: "Action",
    subtitle: "Set pieces, stakes, and whether they earn it",
  },
  Drama: {
    title: "Drama",
    subtitle: "Quiet films with a lot to say",
  },
  "Sci-Fi": {
    title: "Sci-Fi",
    subtitle: "New worlds, reviewed without the fluff",
  },
  Comedy: {
    title: "Comedy",
    subtitle: "Jokes, timing, and whether the laugh lands",
  },
  Thriller: {
    title: "Thriller",
    subtitle: "The ones that keep you looking over your shoulder",
  },
  Animation: {
    title: "Animation",
    subtitle: "Cartoons with more going on than the poster",
  },
  "New releases": {
    title: "New releases",
    subtitle: "Reviews that landed this week",
  },
  "Spoiler-free": {
    title: "Spoiler-free",
    subtitle: "Safe to watch before you see the movie",
  },
  "Top rated": {
    title: "Top rated",
    subtitle: "The reviews people keep coming back to",
  },
};

const exploreCopy: Record<ExploreTopic, string> = {
  Gaming: "Playthroughs, patches, and the games people won't stop talking about",
  Music: "Songs, sessions, and the tracks stuck in everyone's head",
  Live: "Happening right now",
  News: "What just changed, explained without the noise",
  Courses: "Lessons you can actually finish",
  Sports: "The plays, the finishes, and the arguments after",
  "360° Video": "Look around. These play in every direction.",
};

function toggleId(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export function HomeFeed({
  videos,
  profiles,
  commentsByVideoId,
  subscribersByChannel,
  likesByVideoId,
  initialVideoId = null,
  initialChannel = null,
  initialChip = "All",
  initialExplore = null,
  initialLibrary = "home",
}: {
  videos: Video[];
  profiles: ChannelProfile[];
  commentsByVideoId: Record<string, Comment[]>;
  subscribersByChannel: Record<string, string>;
  likesByVideoId: Record<string, number>;
  initialVideoId?: string | null;
  initialChannel?: string | null;
  initialChip?: Chip;
  initialExplore?: ExploreTopic | null;
  initialLibrary?: LibraryView;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>(initialChip);
  const [explore, setExplore] = useState<ExploreTopic | null>(initialExplore);
  const [channel, setChannel] = useState<string | null>(initialChannel);
  const [library, setLibrary] = useState<LibraryView>(initialLibrary);
  const { phone } = useLayoutMode();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialVideoId && videos.some((item) => item.id === initialVideoId) ? initialVideoId : null,
  );

  function openVideo(id: string | null) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setActiveId(id);
    const base = window.location.pathname;
    const path = id ? `${base}?v=${encodeURIComponent(id)}` : base;
    window.history.replaceState(null, "", path);
  }

  useLayoutEffect(() => {
    if (!activeId) return;
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeId]);

  function openChannel(name: string) {
    const slug = channelSlug(name);
    if (!profiles.some((profile) => profile.slug === slug)) return;
    const path = `/channel/${slug}`;
    if (pathname !== path) {
      router.push(path);
      return;
    }
    setChannel(slug);
    setLibrary("home");
    setExplore(null);
    setChip("All");
    openVideo(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      openVideo(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const liked = useMemo(() => new Set(likedIds), [likedIds]);
  const movies = useMemo(
    () => videos.filter((video) => !video.topic && !video.unlisted),
    [videos],
  );
  const channels = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; avatar: string }[] = [];
    for (const video of videos) {
      if (!video.subscribed || video.unlisted || seen.has(video.channel)) continue;
      seen.add(video.channel);
      list.push({ name: video.channel, avatar: video.avatar });
    }
    return list;
  }, [videos]);
  const genre: Genre | null = library === "home" && !explore && isGenre(chip) ? chip : null;
  const activeVideo = videos.find((video) => video.id === activeId) ?? null;

  const filtered = useMemo(
    () => movies.filter((video) => matchesChip(video, chip) && matchesQuery(video, query)),
    [movies, chip, query],
  );

  const exploreFeed = useMemo(
    () =>
      videos.filter(
        (video) => video.topic === explore && !video.unlisted && matchesQuery(video, query),
      ),
    [videos, explore, query],
  );

  const libraryVideos = useMemo(() => {
    const base = videos.filter((video) => !video.unlisted && matchesQuery(video, query));
    if (library === "subscriptions") return base.filter((video) => video.subscribed);
    if (library === "watch-later") return base.filter((video) => saved.has(video.id));
    if (library === "liked") return base.filter((video) => liked.has(video.id));
    if (library === "shorts") return videos.filter((video) => video.source === "short" && matchesQuery(video, query));
    return filtered;
  }, [videos, movies, query, library, saved, liked, filtered]);

  function goHome() {
    setLibrary("home");
    setChip("All");
    setExplore(null);
    setChannel(null);
    setMobileOpen(false);
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    openVideo(null);
  }

  function openLibrary(view: Exclude<LibraryView, "home">) {
    setMobileOpen(false);
    if (view === "shorts") {
      if (pathname !== "/shorts") router.push("/shorts");
      else {
        setLibrary("shorts");
        setExplore(null);
        setChannel(null);
        openVideo(null);
      }
      return;
    }
    if (pathname !== "/") {
      router.push(`/?library=${encodeURIComponent(view)}`);
      return;
    }
    setLibrary(view);
    setExplore(null);
    setChannel(null);
    openVideo(null);
  }

  function chooseGenre(next: Genre) {
    if (pathname !== "/") {
      setMobileOpen(false);
      router.push(`/?chip=${encodeURIComponent(next)}`);
      return;
    }
    setLibrary("home");
    setExplore(null);
    setChannel(null);
    setChip(next);
    openVideo(null);
    setMobileOpen(false);
  }

  function chooseExplore(topic: ExploreTopic) {
    if (pathname !== "/") {
      setMobileOpen(false);
      router.push(`/?explore=${encodeURIComponent(topic)}`);
      return;
    }
    setLibrary("home");
    setExplore(topic);
    setChannel(null);
    openVideo(null);
    setMobileOpen(false);
  }

  function chooseChip(next: Chip) {
    setLibrary("home");
    setChannel(null);
    setChip(next);
    openVideo(null);
  }

  const heading = headings[chip];
  const fresh = filtered.filter((video) => video.shelf === "fresh");
  const popular = filtered.filter((video) => video.shelf === "popular");
  const channelProfile = channel ? (profiles.find((profile) => profile.slug === channel) ?? null) : null;
  const showChannel = Boolean(channelProfile) && library === "home" && !activeVideo && !explore;
  const showShorts = !activeVideo && library === "shorts";
  const showHome = library === "home" && !activeVideo && !explore && !showChannel;

  return (
    <div
      id="top"
      className={cn(
        "@container min-h-full bg-canvas text-ink",
        phone &&
          "phone-shell relative mx-auto flex h-dvh w-[390px] max-w-full flex-col overflow-hidden border-x border-line shadow-2xl",
      )}
    >
      <Header
        query={query}
        phone={phone}
        menuExpanded={desktopOpen || mobileOpen}
        onQueryChange={setQuery}
        onHome={() => {
          setQuery("");
          goHome();
        }}
        onToggleGuide={() => {
          const narrow = window.matchMedia("(max-width: 1023px)").matches;
          if (phone || narrow) setMobileOpen((open) => !open);
          else setDesktopOpen((open) => !open);
        }}
      />

      {!activeVideo ? (
        <>
      <Sidebar
        variant="full"
        library={library}
        explore={explore}
        channels={channels}
        onHome={goHome}
        onLibrary={openLibrary}
        onExplore={chooseExplore}
        onChannel={openChannel}
        onYou={() => setDesktopOpen(true)}
        inert={desktopOpen ? undefined : true}
        contained={phone}
        className={desktopOpen ? "hidden desk:flex" : "hidden"}
      />
      <Sidebar
        variant="mini"
        library={library}
        explore={explore}
        channels={channels}
        onHome={goHome}
        onLibrary={openLibrary}
        onExplore={chooseExplore}
        onChannel={openChannel}
        onYou={() => setDesktopOpen(true)}
        inert={desktopOpen ? true : undefined}
        contained={phone}
        className={desktopOpen ? "hidden" : "hidden desk:flex"}
      />

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className={cn(
              "inset-0 z-30 bg-black/60",
              phone ? "absolute" : "fixed desk:hidden",
            )}
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            variant="full"
            library={library}
            explore={explore}
            channels={channels}
            onHome={goHome}
            onLibrary={openLibrary}
            onExplore={chooseExplore}
            onChannel={openChannel}
            onYou={() => setMobileOpen(false)}
            contained={phone}
            className={cn("z-40 flex", phone ? "" : "desk:hidden")}
          />
        </>
      ) : null}
        </>
      ) : null}

      <main
        className={cn(
          showShorts ? "overflow-hidden px-0 pb-0" : "min-h-0 px-4 pb-12 palm:px-6",
          phone ? cn("flex-1", showShorts ? "overflow-hidden" : "overflow-y-auto") : "min-h-screen pt-14",
          !phone && !activeVideo && (desktopOpen ? "desk:pl-60" : "desk:pl-[72px]"),
        )}
      >
        {activeVideo ? (
          <div className="pt-4">
            <WatchView
              key={activeVideo.id}
              video={activeVideo}
              catalog={videos}
              comments={commentsByVideoId[activeVideo.id] ?? []}
              subscriberLabel={subscribersByChannel[activeVideo.channel] ?? "48K subscribers"}
              likeCount={likesByVideoId[activeVideo.id] ?? 0}
              saved={saved.has(activeVideo.id)}
              liked={liked.has(activeVideo.id)}
              onOpen={(video) => openVideo(video.id)}
              onChannel={openChannel}
              onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
              onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
            />
          </div>
        ) : null}

        {showChannel && channelProfile ? (
          <ChannelView profile={channelProfile} query={query} onOpen={openVideo} />
        ) : null}

        {showHome ? (
          <>
            <div
              className={cn(
                "sticky z-30 -mx-4 bg-canvas px-4 py-3 palm:-mx-6 palm:px-6",
                phone ? "top-0" : "top-14",
              )}
            >
              <div role="tablist" aria-label="Filter reviews" className="no-scrollbar flex gap-3 overflow-x-auto">
                {chips.map((item) => {
                  const selected = chip === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => chooseChip(item)}
                      className={cn(
                        "h-8 shrink-0 rounded-full px-3 text-[14px] font-medium",
                        selected
                          ? "bg-chip text-on-chip"
                          : "bg-raised text-ink hover:bg-raised-hover",
                      )}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pb-5 pt-1">
              <h1 className="text-[28px] font-bold tracking-[-0.03em]">
                {query.trim() ? `Results for “${query.trim()}”` : heading.title}
              </h1>
              <p className="mt-1 text-[16px] text-muted">
                {query.trim() ? `${filtered.length} reviews` : heading.subtitle}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="py-16 text-center text-muted">
                No reviews match that search. Try a genre, a creator, or a title.
              </p>
            ) : (
              <>
                {fresh.length > 0 ? (
                  <VideoGrid
                    videos={fresh}
                    savedIds={saved}
                    likedIds={liked}
                    onOpen={(video) => openVideo(video.id)}
                    onChannel={openChannel}
                    onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                    onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
                  />
                ) : null}
                {popular.length > 0 ? (
                  <section id="popular" className="mt-10 scroll-mt-20">
                    <div className="mb-4 flex items-end justify-between">
                      <h2 className="text-[20px] font-bold">Popular this week</h2>
                      <a
                        href="#popular"
                        className="inline-flex items-center gap-1 text-[14px] font-medium text-muted hover:text-ink"
                      >
                        See all
                        <ChevronRightIcon className="h-4 w-4" />
                      </a>
                    </div>
                    <VideoGrid
                      videos={popular}
                      savedIds={saved}
                      likedIds={liked}
                      onOpen={(video) => openVideo(video.id)}
                    onChannel={openChannel}
                      onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                      onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
                    />
                  </section>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {!activeVideo && explore ? (
          <section className="pt-6">
            <h1 className="text-[28px] font-bold">{explore}</h1>
            <p className="mb-6 mt-1 text-[16px] text-muted">
              {query.trim() ? `${exploreFeed.length} videos` : exploreCopy[explore]}
            </p>
            {exploreFeed.length === 0 ? (
              <p className="py-16 text-muted">No videos match that search.</p>
            ) : (
              <VideoGrid
                videos={exploreFeed}
                savedIds={saved}
                likedIds={liked}
                onOpen={(video) => openVideo(video.id)}
                    onChannel={openChannel}
                onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
              />
            )}
          </section>
        ) : null}

        {showShorts ? (
          libraryVideos.length === 0 ? (
            <div
              className={cn(
                "grid place-items-center px-6 text-center text-muted",
                phone ? "h-full" : "h-[calc(100dvh-3.5rem)]",
              )}
            >
              <p>No reviews match that search. Try a genre, a creator, or a title.</p>
            </div>
          ) : (
            <ShortsFeed
              videos={libraryVideos}
              phone={phone}
              likedIds={liked}
              onLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
              onChannel={openChannel}
            />
          )
        ) : null}

        {!activeVideo && (library === "subscriptions" || library === "watch-later" || library === "liked") ? (
          <section className="pt-6">
            <h1 className="text-[28px] font-bold">
              {library === "subscriptions"
                ? "Subscriptions"
                : library === "watch-later"
                  ? "Watch later"
                  : "Liked videos"}
            </h1>
            <p className="mb-6 mt-1 text-[16px] text-muted">
              {library === "subscriptions"
                ? "New reviews from creators you follow"
                : library === "watch-later"
                  ? "Reviews you saved to watch later"
                  : "Reviews you liked"}
            </p>
            {libraryVideos.length === 0 ? (
              <p className="py-16 text-muted">
                {library === "watch-later"
                  ? "Nothing saved yet. Hover a review and choose Watch later."
                  : library === "liked"
                    ? "No liked reviews yet. Open the menu on a review and add it here."
                    : "No subscribed reviews match that search."}
              </p>
            ) : (
              <VideoGrid
                videos={libraryVideos}
                savedIds={saved}
                likedIds={liked}
                onOpen={(video) => openVideo(video.id)}
                    onChannel={openChannel}
                onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
              />
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
