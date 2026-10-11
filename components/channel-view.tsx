"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { type ChannelProfile, type ChannelVideo } from "@/lib/channel";
import { searchCatalog } from "@/lib/search";
import { withinMargin, type ScoredSlug } from "@/lib/similarity";

type Tab = "Home" | "Videos" | "Shorts" | "Live" | "Podcasts" | "Playlists" | "Posts";
type Sort = "Latest" | "Popular" | "Oldest";

const tabs: Tab[] = ["Home", "Videos", "Shorts", "Live", "Podcasts", "Playlists", "Posts"];
const sorts: Sort[] = ["Latest", "Popular", "Oldest"];

function ShortCard({
  video,
  onOpen,
}: {
  video: ChannelVideo;
  onOpen: (id: string) => void;
}) {
  return (
    <button type="button" onClick={() => onOpen(video.id)} className="text-left">
      <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-[#1a1a1a]">
        <Image src={video.thumbnail} alt="" fill sizes="160px" className="object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[14px] font-medium leading-snug text-white">
          {video.title}
        </span>
      </span>
    </button>
  );
}

function byRank(ids: string[] | null) {
  if (!ids) return null;
  return new Map(ids.map((id, index) => [id, index]));
}

function VideoTile({
  video,
  onOpen,
  className,
  sizes = "260px",
}: {
  video: ChannelVideo;
  onOpen: (id: string) => void;
  className?: string;
  sizes?: string;
}) {
  return (
    <article className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => onOpen(video.id)}
        aria-label={video.title}
        className="group text-left"
      >
        <span className="relative block aspect-video overflow-hidden rounded-xl bg-[#1a1a1a]">
          <Image
            src={video.thumbnail}
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-2 right-2 rounded bg-black/88 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {video.duration}
          </span>
        </span>
      </button>
      <button type="button" onClick={() => onOpen(video.id)} className="text-left">
        <span className="block text-[14px] font-semibold leading-[18px]">{video.title}</span>
        <span className="mt-1 block text-[12px] text-muted">
          {video.views}
          <span aria-hidden="true"> • </span>
          {video.uploaded}
        </span>
      </button>
    </article>
  );
}

export function ChannelView({
  profile,
  query,
  ranked,
  searchFailed = false,
  onOpen,
}: {
  profile: ChannelProfile;
  query: string;
  ranked: ScoredSlug[] | null;
  searchFailed?: boolean;
  onOpen: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Home");
  const [sort, setSort] = useState<Sort>("Latest");
  const [genre, setGenre] = useState("All genres");
  const playlists = [...new Set(profile.videos.map((video) => video.genre))].slice(0, 3).map((item) => ({
    title: `${item} from ${profile.name}`,
    count: `${profile.videos.filter((video) => video.genre === item).length} videos`,
    genre: item,
  }));
  const [searching, setSearching] = useState(false);
  const [tabQuery, setTabQuery] = useState("");
  const [tabResult, setTabResult] = useState<{ query: string; channel: string; scored: ScoredSlug[] } | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [trackedSearch, setTrackedSearch] = useState("");
  const searchTrack = `${tabQuery}\n${profile.name}`;
  if (searchTrack !== trackedSearch) {
    setTrackedSearch(searchTrack);
    setSearchError(false);
  }
  const [subscribed, setSubscribed] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const needle = tabQuery.trim();
    if (!needle) return;
    let cancel = false;
    let retryTimer = 0;
    let attempt = 0;
    const run = () => {
      searchCatalog(needle, { channel: profile.name })
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
          setTabResult({ query: needle, channel: profile.name, scored: result.scored });
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
  }, [tabQuery, profile.name]);

  const headerQuery = query.trim();
  const localQuery = tabQuery.trim();
  const tabRank =
    localQuery && tabResult?.query === localQuery && tabResult.channel === profile.name ? tabResult.scored : null;
  const tabFailed = localQuery.length > 0 && searchError;
  const channelItems = [...profile.videos, ...profile.shorts, ...profile.live];
  const headerMatched = headerQuery ? withinMargin(channelItems, ranked) : null;
  const localMatched = localQuery ? withinMargin(channelItems, tabRank) : null;
  const rank = byRank((localMatched ?? headerMatched)?.map((video) => video.id) ?? null);
  const waiting = !searchFailed && ((headerQuery && !ranked) || (localQuery && !tabRank));

  function matches(video: ChannelVideo) {
    if (waiting) return false;
    if (headerQuery && !headerMatched?.some((item) => item.id === video.id)) return false;
    if (localQuery && !localMatched?.some((item) => item.id === video.id)) return false;
    return true;
  }

  function order(list: ChannelVideo[]) {
    if (!rank) return list;
    return [...list].sort((left, right) => (rank.get(left.id) ?? 1e9) - (rank.get(right.id) ?? 1e9));
  }

  const matched = order(profile.videos.filter(matches));
  const shorts = order(profile.shorts.filter(matches));
  const live = order(profile.live.filter(matches));
  const genreVideos = matched.filter((video) => genre === "All genres" || video.genre === genre);
  const videos =
    headerQuery || localQuery
      ? genreVideos
      : genreVideos.sort((left, right) => {
          if (sort === "Popular") return right.viewCount - left.viewCount;
          if (sort === "Oldest") return right.recency - left.recency;
          return left.recency - right.recency;
        });

  function selectTab(next: Tab) {
    setGenre("All genres");
    setTab(next);
  }

  function openPlaylist(next: string) {
    setGenre(next);
    setTab("Videos");
    setSort("Latest");
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <section className="relative h-[140px] overflow-hidden rounded-xl bg-[#121212] palm:h-[180px]">
        {profile.banner ? (
          <Image
            src={profile.banner}
            alt=""
            fill
            preload
            sizes="(min-width: 1180px) 1100px, 100vw"
            className="object-cover"
          />
        ) : null}
      </section>

      <section className="flex items-center gap-4 palm:gap-6">
        <Image
          src={profile.avatar}
          alt=""
          width={160}
          height={160}
          className="h-[88px] w-[88px] shrink-0 rounded-full object-cover palm:h-40 palm:w-40"
        />
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] palm:text-[36px]">
            {profile.name}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            {profile.handle}
            <span className="px-1.5">•</span>
            {profile.subscribers}
            <span className="px-1.5">•</span>
            {profile.videoCount} {profile.videoCount === 1 ? "video" : "videos"}
          </p>
          <p className="mt-1 max-w-xl text-[14px] leading-5">
            {more ? profile.about : profile.bio}{" "}
            <button type="button" onClick={() => setMore((open) => !open)} className="font-semibold">
              {more ? "Show less" : "...more"}
            </button>
          </p>
          <button
            type="button"
            aria-pressed={subscribed}
            onClick={() => setSubscribed((value) => !value)}
            className="mt-3 h-9 rounded-full bg-chip px-4 text-[14px] font-medium text-on-chip"
          >
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
        </div>
      </section>

      <div className="flex items-end justify-between gap-4 border-b border-line">
        <div role="tablist" aria-label="Channel sections" className="no-scrollbar flex gap-6 overflow-x-auto">
          {tabs.map((item) => {
            const selected = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                  onClick={() => selectTab(item)}
                className={cn(
                  "shrink-0 border-b-2 pb-3 text-[16px]",
                  selected ? "border-ink font-medium" : "border-transparent text-muted",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
        {searching ? (
          <input
            autoFocus
            value={tabQuery}
            onChange={(event) => setTabQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search this channel"
            className="mb-2 h-8 w-40 shrink-0 rounded-full border border-line bg-transparent px-3 text-[14px] outline-none placeholder:text-muted"
          />
        ) : (
          <button
            type="button"
            aria-label="Search this channel"
            onClick={() => setSearching(true)}
            className="mb-3 shrink-0 text-ink"
          >
            <SearchIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {tab === "Home" ? (
        <section>
          <h2 className="mb-3 text-[20px] font-bold">Videos</h2>
          {videos.length === 0 ? (
            <p className="py-16 text-muted">{searchFailed || tabFailed ? "Search is unavailable right now." : waiting ? "Searching…" : "No videos match that search."}</p>
          ) : (
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {videos.map((video) => (
                <VideoTile key={video.id} video={video} onOpen={onOpen} className="w-[260px] shrink-0" />
              ))}
            </div>
          )}
          {shorts.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-3 text-[20px] font-bold">Shorts</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 palm:grid-cols-4 desk:grid-cols-6">
                {shorts.map((video) => (
                  <ShortCard key={video.id} video={video} onOpen={onOpen} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "Videos" ? (
        <>
          <div role="tablist" aria-label="Sort videos" className="flex flex-wrap gap-2">
            {genre !== "All genres" ? (
              <button
                type="button"
                onClick={() => setGenre("All genres")}
                className="h-8 rounded-lg bg-chip px-3 text-[14px] font-medium text-on-chip"
              >
                All videos
              </button>
            ) : null}
            {sorts.map((item) => {
              const selected = sort === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSort(item)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-[14px]",
                    selected ? "bg-chip font-medium text-on-chip" : "bg-raised text-ink hover:bg-raised-hover",
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
          {videos.length === 0 ? (
            <p className="py-16 text-muted">{searchFailed || tabFailed ? "Search is unavailable right now." : waiting ? "Searching…" : "No videos match that search."}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 palm:grid-cols-2 desk:grid-cols-4">
              {videos.map((video) => (
                <VideoTile
                  key={video.id}
                  video={video}
                  onOpen={onOpen}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {tab === "Shorts" ? (
        shorts.length === 0 ? (
          <p className="py-16 text-muted">
            {searchFailed || tabFailed ? "Search is unavailable right now." : waiting ? "Searching…" : profile.shorts.length === 0 ? "No shorts yet." : "No shorts match that search."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 palm:grid-cols-4 desk:grid-cols-6">
            {shorts.map((video) => (
              <ShortCard key={video.id} video={video} onOpen={onOpen} />
            ))}
          </div>
        )
      ) : null}

      {tab === "Live" ? (
        live.length === 0 ? (
          <p className="py-16 text-muted">
            {searchFailed || tabFailed ? "Search is unavailable right now." : waiting ? "Searching…" : profile.live.length === 0 ? "No live videos right now." : "No live videos match that search."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 palm:grid-cols-2 desk:grid-cols-4">
            {live.map((video) => (
              <VideoTile
                key={video.id}
                video={video}
                onOpen={onOpen}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
            ))}
          </div>
        )
      ) : null}

      {tab === "Podcasts" ? <p className="py-16 text-muted">No podcasts yet.</p> : null}

      {tab === "Playlists" ? (
        <div className="grid grid-cols-1 gap-4 palm:grid-cols-3">
          {playlists.map((playlist) => {
            const cover = profile.videos.find((video) => video.genre === playlist.genre);
            return (
              <button
                key={playlist.title}
                type="button"
                onClick={() => openPlaylist(playlist.genre)}
                className="overflow-hidden rounded-xl text-left"
              >
                <span className="relative block aspect-video bg-[#1a1a1a]">
                  {cover ? (
                    <Image src={cover.thumbnail} alt="" fill sizes="33vw" className="object-cover" />
                  ) : null}
                  <span className="absolute inset-0 bg-black/35" />
                  <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <span className="block text-[16px] font-bold">{playlist.title}</span>
                    <span className="mt-1 block text-[13px] text-white/80">{playlist.count}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {tab === "Posts" ? (
        <article className="max-w-xl rounded-2xl bg-raised p-4">
          <div className="flex items-center gap-3">
            <Image
              src={profile.avatar}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-[14px] font-semibold">{profile.name}</p>
              <p className="text-[12px] text-muted">3 days ago</p>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-5">{profile.bio} Tell me what you want covered next.</p>
        </article>
      ) : null}
    </div>
  );
}
