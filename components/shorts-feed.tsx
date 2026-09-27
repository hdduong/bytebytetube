"use client";

import Image from "next/image";
import { useState } from "react";
import { CommentIcon, ShareIcon, ThumbUpIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Video } from "@/lib/videos";

export function ShortsFeed({
  videos,
  phone,
  likedIds,
  onLike,
  onChannel,
}: {
  videos: Video[];
  phone: boolean;
  likedIds: Set<string>;
  onLike: (video: Video) => void;
  onChannel: (channel: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      aria-label="Shorts"
      className={cn(
        "snap-y snap-mandatory overflow-y-auto overscroll-y-contain",
        phone ? "h-full" : "h-[calc(100dvh-3.5rem)]",
      )}
    >
      {videos.map((video) => {
        const liked = likedIds.has(video.id);
        return (
          <article
            key={video.id}
            className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-6 left-4 right-16 text-white">
              <button
                type="button"
                onClick={() => onChannel(video.channel)}
                className="text-[14px] font-semibold"
              >
                {video.channel}
              </button>
              <p className="mt-1 text-[16px] font-medium leading-snug">{video.title}</p>
            </div>
            <div className="absolute bottom-6 right-3 flex flex-col items-center gap-4 text-white">
              <button
                type="button"
                aria-pressed={liked}
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => onLike(video)}
                className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
              >
                <ThumbUpIcon filled={liked} className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Comment"
                className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
              >
                <CommentIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label={copiedId === video.id ? "Link copied" : "Share"}
                onClick={() => void share(video.id)}
                className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
              >
                <ShareIcon className="h-6 w-6" />
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
