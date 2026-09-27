"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChannelView } from "@/components/channel-view";
import { ChevronRightIcon } from "@/components/icons";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { VideoGrid } from "@/components/video-card";
import { WatchView } from "@/components/watch-view";
import { cn } from "@/lib/cn";
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
  Learning: "Lessons you can actually finish",
  Sports: "The plays, the finishes, and the arguments after",
  "360° Video": "Look around. These play in every direction.",
};

function toggleId(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export function HomeFeed({
  videos,
  initialVideoId = null,
  initialChannel = null,
  initialChip = "All",
  initialExplore = null,
  initialLibrary = "home",
}: {
  videos: Video[];
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
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialVideoId && videos.some((item) => item.id === initialVideoId) ? initialVideoId : null,
  );

  function openVideo(id: string | null) {
    setActiveId(id);
    const base = window.location.pathname;
    const path = id ? `${base}?v=${encodeURIComponent(id)}` : base;
    window.history.replaceState(null, "", path);
  }

  function openChannel(name: string) {
    if (name !== "Nerd Frames") return;
    if (pathname !== "/channel/nerd-frames") {
      router.push("/channel/nerd-frames");
      return;
    }
    setChannel("nerd-frames");
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
    if (library === "shorts") return movies.filter((video) => matchesQuery(video, query));
    return filtered;
  }, [videos, movies, query, library, saved, liked, filtered]);

  function goHome() {
    setLibrary("home");
    setChip("All");
    setExplore(null);
    setChannel(null);
    setMobileOpen(false);
    if (pathname.startsWith("/channel")) {
      router.push("/");
      return;
    }
    openVideo(null);
  }

  function openLibrary(view: Exclude<LibraryView, "home">) {
    if (pathname.startsWith("/channel")) {
      setMobileOpen(false);
      router.push(`/?library=${encodeURIComponent(view)}`);
      return;
    }
    setLibrary(view);
    setExplore(null);
    setChannel(null);
    openVideo(null);
    setMobileOpen(false);
  }

  function chooseGenre(next: Genre) {
    if (pathname.startsWith("/channel")) {
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
    if (pathname.startsWith("/channel")) {
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
  const showChannel = channel === "nerd-frames" && library === "home" && !activeVideo && !explore;
  const showHome = library === "home" && !activeVideo && !explore && !showChannel;

  return (
    <div id="top" className="min-h-full bg-canvas text-ink">
      <Header
        query={query}
        menuExpanded={desktopOpen || mobileOpen}
        onQueryChange={setQuery}
        onHome={() => {
          setQuery("");
          goHome();
        }}
        onToggleGuide={() => {
          if (window.innerWidth >= 1024) setDesktopOpen((open) => !open);
          else setMobileOpen((open) => !open);
        }}
      />

      {!activeVideo ? (
        <>
      <Sidebar
        variant="full"
        library={library}
        genre={genre}
        explore={explore}
        onHome={goHome}
        onLibrary={openLibrary}
        onGenre={chooseGenre}
        onExplore={chooseExplore}
        inert={desktopOpen ? undefined : true}
        className={desktopOpen ? "hidden lg:flex" : "hidden"}
      />
      <Sidebar
        variant="mini"
        library={library}
        genre={genre}
        explore={explore}
        onHome={goHome}
        onLibrary={openLibrary}
        onGenre={chooseGenre}
        onExplore={chooseExplore}
        inert={desktopOpen ? true : undefined}
        className={desktopOpen ? "hidden" : "hidden lg:flex"}
      />

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            variant="full"
            library={library}
            genre={genre}
            explore={explore}
            onHome={goHome}
            onLibrary={openLibrary}
            onGenre={chooseGenre}
            onExplore={chooseExplore}
            className="z-40 flex lg:hidden"
          />
        </>
      ) : null}
        </>
      ) : null}

      <main
        className={cn(
          "min-h-screen px-4 pb-12 pt-14 sm:px-6",
          !activeVideo && (desktopOpen ? "lg:pl-60" : "lg:pl-[72px]"),
        )}
      >
        {activeVideo ? (
          <div className="pt-4">
            <WatchView
              key={activeVideo.id}
              video={activeVideo}
              catalog={videos}
              saved={saved.has(activeVideo.id)}
              liked={liked.has(activeVideo.id)}
              onOpen={(video) => openVideo(video.id)}
              onChannel={openChannel}
              onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
              onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
            />
          </div>
        ) : null}

        {showChannel ? <ChannelView query={query} onOpen={openVideo} /> : null}

        {showHome ? (
          <>
            <div className="sticky top-14 z-30 -mx-4 bg-canvas px-4 py-3 sm:-mx-6 sm:px-6">
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

        {!activeVideo && library === "shorts" ? (
          <section className="pt-6">
            <h1 className="mb-4 text-[28px] font-bold">Shorts</h1>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
              {libraryVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => openVideo(video.id)}
                  className="w-[180px] shrink-0 text-left"
                >
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-[#1a1a1a]">
                    <Image
                      src={video.thumbnail}
                      alt=""
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[14px] font-medium leading-snug">
                      {video.title}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
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
