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
import { loadTaste, recommendFromTaste, type TasteProfile } from "@/lib/preferences";
import { searchCatalog } from "@/lib/search";
import { scopeKey, withinMargin, type ScoredSlug, type SearchScope } from "@/lib/similarity";
import type { Comment } from "@/lib/watch";
import {
  chips,
  isGenre,
  matchesChip,
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

function applySearch<T extends { id: string }>(list: T[], query: string, scored: ScoredSlug[] | null) {
  if (!query.trim()) return list;
  return withinMargin(list, scored);
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
  const [searchResult, setSearchResult] = useState<{ query: string; scope: string; scored: ScoredSlug[] } | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [taste, setTaste] = useState<TasteProfile>({ scores: {}, opens: 0, watchSeconds: 0, last: null });
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

  const searchScope = useMemo((): SearchScope => {
    if (channel) {
      const name = profiles.find((profile) => profile.slug === channel)?.name;
      if (name) return { channel: name };
    }
    if (explore) return { topic: explore, unlisted: false };
    if (library === "shorts") return { source: "short" };
    if (library === "subscriptions") return { unlisted: false, subscribed: true };
    if (library === "watch-later") return { ids: savedIds, unlisted: false };
    if (library === "liked") return { ids: likedIds, unlisted: false };
    if (isGenre(chip)) return { unlisted: false, topic: null, genre: chip };
    if (chip === "New releases") return { unlisted: false, topic: null, newRelease: true };
    if (chip === "Spoiler-free") return { unlisted: false, topic: null, spoilerFree: true };
    if (chip === "Top rated") return { unlisted: false, topic: null, topRated: true };
    return { unlisted: false, topic: null };
  }, [channel, profiles, explore, library, chip, savedIds, likedIds]);

  useEffect(() => {
    const refresh = () => setTaste(loadTaste());
    refresh();
    window.addEventListener("cinematube-taste", refresh);
    return () => window.removeEventListener("cinematube-taste", refresh);
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (!needle) {
      setSearchError(false);
      return;
    }
    setSearchError(false);
    let cancel = false;
    let retryTimer = 0;
    let attempt = 0;
    const run = () => {
      const scope = scopeKey(searchScope);
      searchCatalog(needle, searchScope)
        .then((result) => {
          if (cancel) return;
          if (result.status === "busy" && attempt < 3) {
            attempt += 1;
            retryTimer = window.setTimeout(run, 400 * attempt);
            return;
          }
          if (result.status === "busy") {
            setSearchError(true);
            return;
          }
          setSearchResult({ query: needle, scope, scored: result.scored });
        })
        .catch(() => {
          if (!cancel) setSearchError(true);
        });
    };
    const timer = window.setTimeout(run, 400);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [query, searchScope]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      openVideo(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const needle = query.trim();
  const ranked =
    needle && searchResult?.query === needle && searchResult.scope === scopeKey(searchScope)
      ? searchResult.scored
      : null;
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
    () => applySearch(movies.filter((video) => matchesChip(video, chip)), query, ranked),
    [movies, chip, query, ranked],
  );

  const exploreFeed = useMemo(
    () => applySearch(videos.filter((video) => video.topic === explore && !video.unlisted), query, ranked),
    [videos, explore, query, ranked],
  );

  const libraryVideos = useMemo(() => {
    const visible = videos.filter((video) => !video.unlisted);
    if (library === "subscriptions") return applySearch(visible.filter((video) => video.subscribed), query, ranked);
    if (library === "watch-later") return applySearch(visible.filter((video) => saved.has(video.id)), query, ranked);
    if (library === "liked") return applySearch(visible.filter((video) => liked.has(video.id)), query, ranked);
    if (library === "shorts") return applySearch(videos.filter((video) => video.source === "short"), query, ranked);
    return filtered;
  }, [videos, query, ranked, library, saved, liked, filtered]);

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
  const forYou = recommendFromTaste(filtered, taste);
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
          <ChannelView profile={channelProfile} query={query} ranked={ranked} searchFailed={searchError} onOpen={openVideo} />
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
                {query.trim()
                  ? searchError
                    ? "Search is unavailable right now."
                    : ranked
                      ? `${filtered.length} ${filtered.length === 1 ? "review" : "reviews"}`
                      : "Searching…"
                  : heading.subtitle}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="py-16 text-center text-muted">
                {searchError ? "Search is unavailable right now." : query.trim() && !ranked ? "Searching…" : "No videos match that search."}
              </p>
            ) : query.trim() ? (
              <VideoGrid
                videos={filtered}
                savedIds={saved}
                likedIds={liked}
                onOpen={(video) => openVideo(video.id)}
                onChannel={openChannel}
                onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
              />
            ) : (
              <>
                {forYou.videos.length > 0 ? (
                  <section className="mb-10">
                    <h2 className="text-[20px] font-bold">Recommended for you</h2>
                    <p className="mb-4 mt-1 text-[14px] text-muted">
                      Based on {forYou.top.map((dimension) => dimension.label).join(", ")}
                    </p>
                    <VideoGrid
                      videos={forYou.videos}
                      savedIds={saved}
                      likedIds={liked}
                      onOpen={(video) => openVideo(video.id)}
                      onChannel={openChannel}
                      onToggleSave={(video) => setSavedIds((current) => toggleId(current, video.id))}
                      onToggleLike={(video) => setLikedIds((current) => toggleId(current, video.id))}
                    />
                  </section>
                ) : null}
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
              <p>{searchError ? "Search is unavailable right now." : query.trim() && !ranked ? "Searching…" : "No videos match that search."}</p>
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
