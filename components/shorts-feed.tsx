"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CommentIcon, ShareIcon, ThumbUpIcon } from "@/components/icons";
import { MediaVideo } from "@/components/media-video";
import { cn } from "@/lib/cn";
import { nextShorts } from "@/lib/shorts";
import { shortKey } from "@/lib/shorts-plan";
import type { Video } from "@/lib/videos";

const WINDOW = 8;
const BATCH = 3;

type Occurrence = { key: string; video: Video };

function stableItems(videos: Video[]): Occurrence[] {
  const seen = new Map<string, number>();
  return videos.map((video) => {
    const count = seen.get(video.id) ?? 0;
    seen.set(video.id, count + 1);
    return { key: count === 0 ? video.id : shortKey(video.id, count), video };
  });
}

export function ShortsFeed({
  videos,
  phone,
  likedIds,
  onLike,
  onChannel,
}: {
  videos?: Video[];
  phone: boolean;
  likedIds: Set<string>;
  onLike: (video: Video) => void;
  onChannel: (channel: string) => void;
}) {
  if (videos) {
    return (
      <ShortsReel
        phone={phone}
        likedIds={likedIds}
        onLike={onLike}
        onChannel={onChannel}
        items={stableItems(videos)}
      />
    );
  }
  return <RecommendedShorts phone={phone} likedIds={likedIds} onLike={onLike} onChannel={onChannel} />;
}

function RecommendedShorts(props: {
  phone: boolean;
  likedIds: Set<string>;
  onLike: (video: Video) => void;
  onChannel: (channel: string) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  return <RecommendedRun key={attempt} {...props} onRetry={() => setAttempt((current) => current + 1)} />;
}

function RecommendedRun({
  phone,
  likedIds,
  onLike,
  onChannel,
  onRetry,
}: {
  phone: boolean;
  likedIds: Set<string>;
  onLike: (video: Video) => void;
  onChannel: (channel: string) => void;
  onRetry: () => void;
}) {
  const [items, setItems] = useState<Occurrence[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [tailError, setTailError] = useState(false);
  const session = useRef(0);
  const flight = useRef(0);
  const flightSession = useRef(0);
  const occurrence = useRef(0);
  const itemsRef = useRef<Occurrence[]>([]);
  const historyRef = useRef<string[]>([]);
  const doneRef = useRef(false);
  const activeKey = useRef("");
  const tailErrorRef = useRef(false);

  function store(next: Occurrence[]) {
    itemsRef.current = next;
    setItems(next);
  }

  const append = useCallback(async (sessionId: number, force = false) => {
    if (doneRef.current) return;
    if (flight.current !== 0 && (!force || flightSession.current === sessionId)) return;
    const ticket = ++flight.current;
    flightSession.current = sessionId;
    const list = itemsRef.current;
    const activeIndex = list.findIndex((item) => item.key === activeKey.current);
    const current = (activeIndex >= 0 ? list[activeIndex] : list.at(-1))?.video.id;
    const recent = list.slice(0, Math.max(0, activeIndex)).map((item) => item.video.id);
    const queued = list.slice(Math.max(0, activeIndex + 1)).map((item) => item.video.id);
    const exclude = [...historyRef.current, ...recent, ...queued];
    if (current) exclude.push(current);
    const anchor = list.at(-1)?.video.id;
    try {
      const result = await nextShorts({
        ...(anchor ? { anchor } : {}),
        exclude: exclude.slice(-80),
        count: BATCH,
      });
      if (session.current !== sessionId || flight.current !== ticket) return;
      if (result.status === "error") {
        if (itemsRef.current.length === 0) setPhase("error");
        else {
          tailErrorRef.current = true;
          setTailError(true);
        }
        return;
      }
      if (result.status === "empty") {
        doneRef.current = true;
        setPhase("empty");
        return;
      }
      const added = result.videos.map((video) => {
        occurrence.current += 1;
        return { key: shortKey(video.id, occurrence.current), video };
      });
      store([...itemsRef.current, ...added]);
      doneRef.current = result.complete;
      tailErrorRef.current = false;
      setTailError(false);
      setPhase(itemsRef.current.length === 0 ? "empty" : "ready");
    } catch {
      if (session.current !== sessionId || flight.current !== ticket) return;
      if (itemsRef.current.length === 0) setPhase("error");
      else {
        tailErrorRef.current = true;
        setTailError(true);
      }
    } finally {
      if (flight.current === ticket) flight.current = 0;
    }
  }, []);

  const onActive = useCallback((key: string) => {
    activeKey.current = key;
    const index = itemsRef.current.findIndex((item) => item.key === key);
    if (!doneRef.current && !tailErrorRef.current && index >= itemsRef.current.length - 2) {
      void append(session.current);
    }
  }, [append]);

  const onTrim = useCallback((dropped: Occurrence[]) => {
    const keys = new Set(dropped.map((item) => item.key));
    historyRef.current = [...historyRef.current, ...dropped.map((item) => item.video.id)].slice(-24);
    itemsRef.current = itemsRef.current.filter((item) => !keys.has(item.key));
    setItems(itemsRef.current);
  }, []);

  useEffect(() => {
    const sessionId = ++session.current;
    void append(sessionId, true);
    return () => {
      session.current += 1;
    };
  }, [append]);

  if (phase === "loading") return <ShortsStatus phone={phone} message="Finding a Short…" />;
  if (phase === "empty") return <ShortsStatus phone={phone} message="No Shorts yet." />;
  if (phase === "error") {
    return (
      <ShortsStatus phone={phone} message="Shorts are unavailable right now.">
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
        >
          Try again
        </button>
      </ShortsStatus>
    );
  }

  return (
    <ShortsReel
      phone={phone}
      likedIds={likedIds}
      onLike={onLike}
      onChannel={onChannel}
      items={items}
      tailError={tailError}
      onRetryTail={() => {
        if (flight.current !== 0) return;
        tailErrorRef.current = false;
        setTailError(false);
        void append(session.current, true);
      }}
      onActive={onActive}
      onTrim={onTrim}
    />
  );
}

function ShortsReel({
  items,
  phone,
  likedIds,
  onLike,
  onChannel,
  tailError = false,
  onRetryTail,
  onActive,
  onTrim,
}: {
  items: Occurrence[];
  phone: boolean;
  likedIds: Set<string>;
  onLike: (video: Video) => void;
  onChannel: (channel: string) => void;
  tailError?: boolean;
  onRetryTail?: () => void;
  onActive?: (key: string) => void;
  onTrim?: (dropped: Occurrence[]) => void;
}) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? "");
  const scroller = useRef<HTMLElement>(null);
  const pendingTrim = useRef(0);
  const onActiveRef = useRef(onActive);
  const onTrimRef = useRef(onTrim);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const active = items.some((item) => item.key === activeKey) ? activeKey : (items[0]?.key ?? "");

  useLayoutEffect(() => {
    const root = scroller.current;
    if (!pendingTrim.current || !root) return;
    root.scrollTop -= pendingTrim.current;
    pendingTrim.current = 0;
  }, [items]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    onActiveRef.current = onActive;
    onTrimRef.current = onTrim;
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((entry) => entry.intersectionRatio >= 0.6)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const id = seen?.target.getAttribute("data-short-key");
        if (!id) return;
        setActiveKey(id);
        onActiveRef.current?.(id);
        const trim = onTrimRef.current;
        if (!trim || items.length <= WINDOW) return;
        const nodes = [...root.querySelectorAll<HTMLElement>("[data-short-key]")];
        const index = nodes.findIndex((node) => node.getAttribute("data-short-key") === id);
        if (index < 3) return;
        const drop = Math.min(index - 1, items.length - WINDOW);
        if (drop <= 0) return;
        let height = 0;
        for (let cursor = 0; cursor < drop; cursor += 1) height += nodes[cursor]?.offsetHeight ?? 0;
        pendingTrim.current = height;
        trim(items.slice(0, drop));
      },
      { root, threshold: 0.6 },
    );
    for (const item of root.querySelectorAll("[data-short-key]")) observer.observe(item);
    return () => observer.disconnect();
  }, [items, onActive, onTrim]);

  async function share(videoId: string) {
    setCopiedId(videoId);
    window.setTimeout(() => {
      setCopiedId((current) => (current === videoId ? null : current));
    }, 2000);
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // The button stays available when the clipboard is blocked.
    }
  }

  return (
    <section
      ref={scroller}
      aria-label="Shorts"
      className={cn(
        "relative snap-y snap-mandatory overflow-y-auto overscroll-y-contain",
        phone ? "h-full" : "h-[calc(100dvh-3.5rem)]",
      )}
    >
      {items.map((item) => {
        const liked = likedIds.has(item.video.id);
        const playing = item.key === active;
        return (
          <article
            key={item.key}
            data-short-key={item.key}
            data-short-id={item.video.id}
            className="flex h-full w-full shrink-0 snap-start snap-always items-center justify-center bg-black [container-type:size]"
          >
            <div
              className="relative overflow-hidden bg-black"
              style={{
                aspectRatio: "9 / 16",
                width: "min(100cqw, calc(100cqh * 9 / 16))",
                height: "min(100cqh, calc(100cqw * 16 / 9))",
              }}
            >
              {item.video.src ? (
                <MediaVideo
                  src={item.video.src}
                  poster={item.video.thumbnail}
                  active={playing}
                  autoPlay={playing}
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <Image src={item.video.thumbnail} alt="" fill sizes="100vw" className="object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-4 right-16 text-white">
                <button type="button" onClick={() => onChannel(item.video.channelSlug || item.video.channel)} className="text-[14px] font-semibold">
                  {item.video.channel}
                </button>
                <p className="mt-1 text-[16px] font-medium leading-snug">{item.video.title}</p>
              </div>
              <div className="absolute bottom-6 right-3 flex flex-col items-center gap-4 text-white">
                <button
                  type="button"
                  aria-pressed={liked}
                  aria-label={liked ? "Unlike" : "Like"}
                  onClick={() => onLike(item.video)}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
                >
                  <ThumbUpIcon filled={liked} className="h-6 w-6" />
                </button>
                <button type="button" aria-label="Comment" className="grid h-11 w-11 place-items-center rounded-full bg-black/40">
                  <CommentIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label={copiedId === item.video.id ? "Link copied" : "Share"}
                  onClick={() => void share(item.video.id)}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
                >
                  <ShareIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {tailError && onRetryTail ? (
        <button
          type="button"
          onClick={onRetryTail}
          className="sticky bottom-4 z-10 mx-auto block rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Try again
        </button>
      ) : null}
    </section>
  );
}

function ShortsStatus({ phone, message, children }: { phone: boolean; message: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "grid place-items-center px-6 text-center text-muted",
        phone ? "h-full" : "h-[calc(100dvh-3.5rem)]",
      )}
    >
      <div>
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}
