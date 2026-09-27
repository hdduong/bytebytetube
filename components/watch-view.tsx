"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { MoreIcon, ThumbUpIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Video } from "@/lib/videos";
import {
  baseLikeCount,
  commentsFor,
  formatCount,
  recommendedVideos,
  subscriberCount,
  watchDescription,
  watchDescriptionMore,
  watchTitle,
  type Comment,
} from "@/lib/watch";

type WatchViewProps = {
  video: Video;
  catalog: Video[];
  saved: boolean;
  liked: boolean;
  onOpen: (video: Video) => void;
  onChannel?: (channel: string) => void;
  onToggleSave: (video: Video) => void;
  onToggleLike: (video: Video) => void;
};

function parseDuration(value: string) {
  const [minutes, seconds] = value.split(":").map(Number);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return 0;
  return minutes * 60 + seconds;
}

function formatTime(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function WatchView({
  video,
  catalog,
  saved,
  liked,
  onOpen,
  onChannel,
  onToggleSave,
  onToggleLike,
}: WatchViewProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const commentId = useId();
  const length = parseDuration(video.live ? "0:00" : video.duration);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState(false);
  const [recFilter, setRecFilter] = useState<"all" | "same" | "channel">("all");
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [comments, setComments] = useState<Comment[]>(() => commentsFor(video));
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => {
    if (!playing || length === 0) return;
    const timer = window.setInterval(() => {
      setTime((current) => {
        const next = current + 0.25 * speed;
        if (next >= length) {
          setPlaying(false);
          return length;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, length, speed]);

  const likeTotal = baseLikeCount(video) + (liked ? 1 : 0);
  const isSubscribed = Boolean(subscribed[video.channel]);
  const sameLabel = video.topic ?? video.genre ?? "Related";
  const recommendations = recommendedVideos(video, catalog, recFilter);
  const orderedComments = [...comments].sort((a, b) =>
    sort === "top" ? b.likes - a.likes : 0,
  );

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(video.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch {
      setShareNote(url);
    }
    window.setTimeout(() => setShareNote(""), 2000);
  }

  function addComment() {
    const text = draft.trim();
    if (!text) return;
    setComments((current) => [
      {
        id: `you-${Date.now()}`,
        name: "You",
        handle: "@you",
        avatar: "/avatars/avatar-you.png",
        text,
        posted: "Just now",
        likes: 0,
      },
      ...current,
    ]);
    setDraft("");
  }

  function addReply(commentId: string) {
    const text = replyDraft.trim();
    if (!text) return;
    setComments((current) =>
      current.flatMap((comment) =>
        comment.id === commentId
          ? [
              comment,
              {
                id: `reply-${Date.now()}`,
                name: "You",
                handle: "@you",
                avatar: "/avatars/avatar-you.png",
                text: `Reply to ${comment.handle}: ${text}`,
                posted: "Just now",
                likes: 0,
              },
            ]
          : [comment],
      ),
    );
    setReplyDraft("");
    setReplyTo(null);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_402px]">
      <div>
        <div
          ref={playerRef}
          className="relative aspect-video overflow-hidden rounded-xl bg-black"
        >
          <Image
            src={video.thumbnail}
            alt=""
            fill
            preload
            sizes="(max-width: 1280px) 100vw, 68vw"
            className="object-cover"
          />
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((current) => !current)}
            className="absolute inset-0"
          />
          {video.channel === "Nerd Frames" ? (
            <div className="pointer-events-none absolute right-3 top-3 w-[30%] max-w-[220px] overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/20 sm:right-4 sm:top-4">
              <Image
                src="/avatars/presenter-nerd.png"
                alt=""
                width={320}
                height={180}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : (
            <div className="pointer-events-none absolute right-3 top-3 h-24 w-36 overflow-hidden rounded-lg bg-[#1a1a1a] shadow-2xl ring-1 ring-white/20 sm:h-28 sm:w-44">
              <Image src={video.avatar} alt="" fill sizes="176px" className="object-cover" />
            </div>
          )}
          {captions ? (
            <p className="pointer-events-none absolute inset-x-8 bottom-16 text-center text-sm font-medium text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
              {watchDescription(video)}
            </p>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2 pt-10">
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={length || 1}
              step={0.1}
              value={Math.min(time, length || 1)}
              onChange={(event) => setTime(Number(event.target.value))}
              className="h-1 w-full cursor-pointer accent-[#ff0000]"
            />
            <div className="mt-1 flex items-center justify-between text-white">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => setPlaying((current) => !current)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  type="button"
                  aria-pressed={muted}
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={() => setMuted((current) => !current)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
                >
                  <VolumeIcon muted={muted} />
                </button>
                <p className="px-1 text-[13px] font-medium">
                  {formatTime(time)} / {video.live ? "LIVE" : formatTime(length)}
                </p>
              </div>
              <div className="relative flex items-center">
                <button
                  type="button"
                  aria-pressed={captions}
                  aria-label="Captions"
                  onClick={() => setCaptions((current) => !current)}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold hover:bg-white/10",
                    captions && "text-[#3ea6ff]",
                  )}
                >
                  CC
                </button>
                <button
                  type="button"
                  aria-label="Settings"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((current) => !current)}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
                >
                  <SettingsIcon />
                </button>
                {settingsOpen ? (
                  <div className="absolute bottom-10 right-10 w-36 rounded-lg border border-line bg-menu py-1 text-sm shadow-2xl">
                    {[1, 1.25, 1.5, 2].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setSpeed(value);
                          setSettingsOpen(false);
                        }}
                        className={cn(
                          "block w-full px-3 py-1.5 text-left hover-wash",
                          speed === value && "text-[#3ea6ff]",
                        )}
                      >
                        {value}x
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label="Full screen"
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen();
                    else playerRef.current?.requestFullscreen();
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
                >
                  <FullscreenIcon />
                </button>
              </div>
            </div>
          </div>
        </div>

        <h1 className="mt-3 text-[20px] font-bold leading-snug">{watchTitle(video)}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {onChannel ? (
            <button
              type="button"
              onClick={() => onChannel(video.channel)}
              className="flex min-w-0 items-center gap-3 rounded-full text-left hover:bg-raised"
            >
              <Image
                src={video.avatar}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="min-w-0">
                <span className="block text-[16px] font-medium">{video.channel}</span>
                <span className="block text-[12px] text-muted">{subscriberCount(video.channel)}</span>
              </span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src={video.avatar}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-[16px] font-medium">{video.channel}</p>
                <p className="text-[12px] text-muted">{subscriberCount(video.channel)}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-pressed={isSubscribed}
            onClick={() =>
              setSubscribed((current) => ({
                ...current,
                [video.channel]: !current[video.channel],
              }))
            }
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium",
              isSubscribed
                ? "bg-raised text-ink hover:bg-raised-hover"
                : "bg-chip text-on-chip hover:opacity-90",
            )}
          >
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center overflow-hidden rounded-full bg-raised">
              <button
                type="button"
                aria-pressed={liked}
                onClick={() => {
                  setDisliked(false);
                  onToggleLike(video);
                }}
                className="inline-flex h-9 items-center gap-2 px-3 text-sm font-medium hover-wash"
              >
                <ThumbUpIcon filled={liked} className="h-5 w-5" />
                {formatCount(likeTotal)}
              </button>
              <span className="h-5 w-px bg-line" />
              <button
                type="button"
                aria-pressed={disliked}
                aria-label="Dislike"
                onClick={() => {
                  setDisliked((current) => !current);
                  if (liked) onToggleLike(video);
                }}
                className="grid h-9 w-10 place-items-center hover-wash"
              >
                <ThumbDownIcon filled={disliked} />
              </button>
            </div>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-raised px-3 text-sm font-medium hover:bg-raised-hover"
            >
              <ShareIcon />
              Share
            </button>
            <button
              type="button"
              aria-pressed={saved}
              onClick={() => onToggleSave(video)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-raised px-3 text-sm font-medium hover:bg-raised-hover"
            >
              <SaveIcon filled={saved} />
              {saved ? "Saved" : "Save"}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label="More actions"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full bg-raised hover:bg-raised-hover"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-line bg-menu py-2 text-sm shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSave(video);
                      setMoreOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left hover-wash"
                  >
                    {saved ? "Remove from Watch later" : "Save to Watch later"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      share();
                      setMoreOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left hover-wash"
                  >
                    Copy link
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {shareNote ? <p className="w-full text-sm text-muted">{shareNote}</p> : null}
        </div>

        <div className="mt-4 rounded-xl bg-raised px-3 py-3 text-[14px] leading-6">
          <p className="font-medium">
            {video.views}
            <span className="font-normal text-ink">
              {" "}
              <span aria-hidden="true">• </span>
              {video.uploaded}
            </span>
          </p>
          <p className="mt-1">
            {expanded ? watchDescriptionMore(video) : watchDescription(video)}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-1 font-medium"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>

        <section className="mt-6">
          <div className="flex items-center gap-6">
            <h2 className="text-[16px] font-bold">{comments.length} Comments</h2>
            <button
              type="button"
              onClick={() => setSort((current) => (current === "newest" ? "top" : "newest"))}
              className="inline-flex items-center gap-2 text-sm font-medium"
            >
              <SortIcon />
              Sort by {sort === "newest" ? "newest" : "top"}
            </button>
          </div>
          <form
            className="mt-4 flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              addComment();
            }}
          >
            <Image
              src="/avatars/avatar-you.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <label htmlFor={commentId} className="sr-only">
                Add a comment
              </label>
              <input
                id={commentId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a comment..."
                className="w-full border-b border-line bg-transparent py-1 text-sm outline-none placeholder:text-muted focus:border-ink"
              />
              {draft.trim() ? (
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft("")}
                    className="h-9 rounded-full px-3 text-sm font-medium hover-wash"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 rounded-full bg-[#3ea6ff] px-4 text-sm font-medium text-black"
                  >
                    Comment
                  </button>
                </div>
              ) : null}
            </div>
          </form>
          <ul className="mt-6 space-y-5">
            {orderedComments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Image
                  src={comment.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium">{comment.handle}</span>{" "}
                    <span className="text-muted">{comment.posted}</span>
                  </p>
                  <p className="mt-1 text-[14px]">{comment.text}</p>
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <button
                      type="button"
                      aria-label={`Like comment by ${comment.handle}`}
                      onClick={() =>
                        setComments((current) =>
                          current.map((item) =>
                            item.id === comment.id ? { ...item, likes: item.likes + 1 } : item,
                          ),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover-wash"
                    >
                      <ThumbUpIcon className="h-4 w-4" />
                      {comment.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(comment.id);
                        setReplyDraft("");
                      }}
                      className="rounded-full px-2 py-1 font-medium text-ink hover-wash"
                    >
                      Reply
                    </button>
                  </div>
                  {replyTo === comment.id ? (
                    <form
                      className="mt-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addReply(comment.id);
                      }}
                    >
                      <input
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        placeholder={`Reply to ${comment.handle}`}
                        className="w-full border-b border-line bg-transparent py-1 text-sm outline-none focus:border-ink"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="h-8 rounded-full px-3 text-sm hover-wash"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="h-8 rounded-full bg-[#3ea6ff] px-3 text-sm font-medium text-black"
                        >
                          Reply
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside>
        <h2 className="mb-3 text-[16px] font-bold">Recommended for you</h2>
        <div className="mb-3 flex gap-2">
          {(
            [
              ["all", "All"],
              ["same", sameLabel],
              ["channel", `From ${video.channel}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={recFilter === id}
              onClick={() => setRecFilter(id)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-[14px] font-medium",
                recFilter === id ? "bg-chip text-on-chip" : "bg-raised hover:bg-raised-hover",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {recommendations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full gap-2 rounded-lg p-1 text-left hover:bg-white/[0.06]"
              >
                <span className="relative block h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-[#1a1a1a]">
                  <Image src={item.thumbnail} alt="" fill sizes="168px" className="object-cover" />
                  <span
                    className={cn(
                      "absolute bottom-1 right-1 rounded px-1 py-0.5 text-[12px] font-medium",
                      item.live ? "bg-[#ff0000]" : "bg-black/80",
                    )}
                  >
                    {item.live ? "LIVE" : item.duration}
                  </span>
                </span>
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="line-clamp-2 text-[14px] font-medium leading-snug">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[12px] text-muted">{item.channel}</span>
                  <span className="block text-[12px] text-muted">
                    {item.views}
                    <span aria-hidden="true"> • </span>
                    {item.uploaded}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {recommendations.length === 0 ? (
          <p className="py-6 text-sm text-muted">No recommendations for that filter.</p>
        ) : null}
      </aside>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10h3l4-3v10l-4-3H4z" />
      {muted ? <path d="M16 10l4 4M20 10l-4 4" /> : <path d="M16 9a4 4 0 0 1 0 6" />}
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <circle cx="6" cy="12" r="2" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M8 11.2 15 8M8 12.8 15 16" />
    </svg>
  );
}

function SaveIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h12v16l-6-3.5L6 20V4z" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M8 13.5v-8h2.8a1.2 1.2 0 0 1 1.2 1.2v5.6H8z" />
      <path d="M8 13.5 11.2 19.2a2 2 0 0 0 3.4-1.6l-.8-3.6h4.5a2 2 0 0 0 2-2.3l-.7-5.2a2 2 0 0 0-2-1.7H8" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h10M4 12h7M4 17h4M16 6v12M16 18l-3-3M16 18l3-3" />
    </svg>
  );
}
