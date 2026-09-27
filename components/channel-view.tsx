"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronRightIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import {
  channelGenres,
  nerdFramesVideos,
  type ChannelGenre,
  type ChannelVideo,
} from "@/lib/channel";

type Tab = "Home" | "Videos" | "Shorts" | "Playlists" | "Community" | "About";
type Sort = "Latest" | "Popular" | "Oldest";

const tabs: Tab[] = ["Home", "Videos", "Shorts", "Playlists", "Community", "About"];
const sorts: Sort[] = ["Latest", "Popular", "Oldest"];

const playlists: Array<{ title: string; count: string; genre: ChannelGenre }> = [
  { title: "Sci-fi worth the runtime", count: "2 videos", genre: "Sci-Fi" },
  { title: "Action that earns it", count: "2 videos", genre: "Action" },
  { title: "Horror that stays", count: "2 videos", genre: "Horror" },
];

function VerifiedMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-label="Verified" role="img">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8 12.4 2.6 2.6L16.2 9.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function matchesSearch(video: ChannelVideo, query: string) {
  if (!query) return true;
  const haystack = `${video.title} ${video.overlay} ${video.genre}`.toLowerCase();
  return haystack.includes(query);
}

export function ChannelView({
  query,
  onOpen,
}: {
  query: string;
  onOpen: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Videos");
  const [sort, setSort] = useState<Sort>("Latest");
  const [genre, setGenre] = useState<(typeof channelGenres)[number]>("All genres");
  const [searching, setSearching] = useState(false);
  const [tabQuery, setTabQuery] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [joined, setJoined] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const terms = [query, tabQuery].map((value) => value.trim().toLowerCase()).filter(Boolean);

  const videos = nerdFramesVideos
    .filter(
      (video) =>
        (genre === "All genres" || video.genre === genre) &&
        terms.every((term) => matchesSearch(video, term)),
    )
    .sort((a, b) => {
      if (sort === "Popular") return b.viewCount - a.viewCount;
      if (sort === "Oldest") return b.recency - a.recency;
      return a.recency - b.recency;
    });

  function openPlaylist(next: ChannelGenre) {
    setGenre(next);
    setTab("Videos");
    setSort("Latest");
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <section className="relative h-[180px] overflow-hidden rounded-2xl bg-[#121212]">
        <Image
          src="/channel/banner.png"
          alt=""
          fill
          preload
          sizes="(min-width: 1180px) 1100px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
          <h1 className="font-poster text-[40px] leading-none tracking-wide sm:text-[48px]">NERD FRAMES</h1>
          <p className="mt-2 text-[14px] font-medium text-white/80">Great movies. Bigger conversations.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <Image
            src="/channel/avatar.png"
            alt=""
            width={120}
            height={120}
            className="h-[88px] w-[88px] shrink-0 rounded-full object-cover sm:h-[120px] sm:w-[120px]"
          />
          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">
                Nerd Frames
              </h2>
              <VerifiedMark />
            </div>
            <p className="mt-1 text-[14px] text-muted">
              @NerdFrames
              <span className="px-1.5 text-[#606060]">•</span>
              128K subscribers
              <span className="px-1.5 text-[#606060]">•</span>
              86 videos
            </p>
            <p className="mt-2 max-w-[500px] text-[14px] leading-5 text-muted">
              Honest reviews, deep dives, and a love for great cinema.
              {aboutOpen
                ? " New releases, old favorites, and the endings people argue about — spoiler-free unless the title says otherwise."
                : null}
            </p>
            <button
              type="button"
              aria-expanded={aboutOpen}
              onClick={() => {
                setAboutOpen((open) => !open);
                if (!aboutOpen) setTab("About");
              }}
              className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold hover:underline"
            >
              {aboutOpen ? "Show less" : "More about this channel"}
              <ChevronRightIcon className={cn("h-4 w-4", aboutOpen && "rotate-90")} />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            aria-pressed={subscribed}
            onClick={() => setSubscribed((value) => !value)}
            className="rounded-full bg-chip px-6 py-3 text-[14px] font-bold text-on-chip"
          >
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
          <button
            type="button"
            aria-pressed={joined}
            onClick={() => setJoined((value) => !value)}
            className={cn(
              "rounded-full border px-6 py-3 text-[14px] font-bold",
              joined ? "border-ink bg-chip text-on-chip" : "border-line",
            )}
          >
            {joined ? "Joined" : "Join"}
          </button>
        </div>
      </section>

      <div className="border-b border-line">
        <div className="flex items-end gap-6 overflow-x-auto">
          <div role="tablist" aria-label="Channel sections" className="flex gap-8">
            {tabs.map((item) => {
              const selected = tab === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item)}
                  className={cn(
                    "shrink-0 border-b-[3px] pb-3 text-[15px]",
                    selected ? "border-ink font-bold" : "border-transparent font-medium text-muted",
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
              placeholder="Search this channel"
              aria-label="Search this channel"
              className="mb-2 h-8 w-40 shrink-0 rounded-full border border-line bg-transparent px-3 text-[13px] outline-none placeholder:text-muted"
            />
          ) : (
            <button
              type="button"
              aria-label="Search this channel"
              onClick={() => setSearching(true)}
              className="mb-3 shrink-0 text-muted hover:text-ink"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </div>

      {tab === "Videos" || tab === "Home" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Sort videos" className="flex gap-2">
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
                      "rounded-full px-4 py-2 text-[13px]",
                      selected ? "bg-chip font-semibold text-on-chip" : "bg-raised font-normal text-ink hover:bg-raised-hover",
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div role="tablist" aria-label="Filter by genre" className="no-scrollbar flex gap-2 overflow-x-auto">
              {channelGenres.map((item) => {
                const selected = genre === item;
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setGenre(item)}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-[13px]",
                      selected ? "bg-chip font-semibold text-on-chip" : "bg-raised font-normal text-ink hover:bg-raised-hover",
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {videos.length === 0 ? (
            <p className="py-16 text-center text-muted">No videos match that filter.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {videos.map((video) => (
                <article key={video.id} className="flex flex-col gap-2">
                  <button type="button" onClick={() => onOpen(video.id)} className="group text-left">
                    <span className="relative block aspect-video overflow-hidden rounded-xl bg-[#1a1a1a]">
                      <Image
                        src={video.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1180px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3">
                        <span className="block font-poster text-[22px] uppercase leading-none tracking-wide text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
                          {video.overlay}
                        </span>
                      </span>
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
              ))}
            </div>
          )}
        </>
      ) : null}

      {tab === "Shorts" ? (
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
          {nerdFramesVideos.slice(0, 6).map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => onOpen(video.id)}
              className="w-[180px] shrink-0 text-left"
            >
              <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-[#1a1a1a]">
                <Image src={video.thumbnail} alt="" fill sizes="180px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[14px] font-semibold leading-snug text-white">
                  {video.title}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "Playlists" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {playlists.map((playlist) => {
            const cover = nerdFramesVideos.find((video) => video.genre === playlist.genre);
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

      {tab === "Community" ? (
        <article className="max-w-xl rounded-2xl bg-raised p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/channel/avatar.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-[14px] font-semibold">Nerd Frames</p>
              <p className="text-[12px] text-muted">3 days ago</p>
            </div>
          </div>
          <p className="mt-3 text-[14px] leading-5">
            New review is up: a sci-fi that actually trusts the audience. Tell me what you want covered next.
          </p>
        </article>
      ) : null}

      {tab === "About" ? (
        <section className="max-w-xl text-[14px] leading-6 text-muted">
          <p>
            Nerd Frames is a movie-review channel for people who want the conversation, not just a score.
            Honest reviews, deep dives, and a love for great cinema.
          </p>
          <p className="mt-3">
            128K subscribers · 86 videos · Joined 2019
          </p>
          <p className="mt-3">For business inquiries: reviews@nerdframes.example</p>
        </section>
      ) : null}
    </div>
  );
}
