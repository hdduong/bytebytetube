import Image from "next/image";
import { ClockIcon, MoreIcon, ThumbUpIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { OverlayPart, Video } from "@/lib/videos";

type VideoCardProps = {
  video: Video;
  preload?: boolean;
  saved?: boolean;
  liked?: boolean;
  onOpen: (video: Video) => void;
  onToggleSave: (video: Video) => void;
  onToggleLike: (video: Video) => void;
};

function OverlayLine({ parts }: { parts: OverlayPart[] }) {
  return (
    <span className="block">
      {parts.map((part) => {
        const script = part.style === "script";
        return (
          <span
            key={part.text}
            className={cn(
              "relative inline-block [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]",
              script
                ? "font-script text-[clamp(0.95rem,11cqi,1.45rem)] leading-none tracking-wide normal-case"
                : "font-poster text-[clamp(0.9rem,9cqi,1.28rem)] uppercase leading-[0.9] tracking-wide",
              part.tone === "red" ? "text-[#ff2d2d]" : "text-white",
            )}
          >
            {part.text}
            {part.underline ? (
              <svg
                viewBox="0 0 120 10"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-2 w-full"
                aria-hidden="true"
              >
                <path
                  d="M2 6c18-6 36 4 58-1s40 2 58-2"
                  fill="none"
                  stroke="#ff2d2d"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

export function VideoCard({
  video,
  preload = false,
  saved = false,
  liked = false,
  onOpen,
  onToggleSave,
  onToggleLike,
}: VideoCardProps) {
  return (
    <article className="group">
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpen(video)}
          className="block w-full overflow-hidden rounded-xl text-left"
        >
          <span className="relative block aspect-video bg-[#1a1a1a] @container">
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              preload={preload}
              className="object-cover transition duration-200 group-hover:brightness-110"
            />
            <span
              className={cn(
                "pointer-events-none absolute inset-0 flex p-3.5",
                video.align === "left" && "items-end justify-start pb-6",
                video.align === "center" && "items-center justify-center text-center",
                video.align === "right" && "items-center justify-end pr-4 text-right",
              )}
            >
              <span
                className={cn(
                  "flex max-w-[86%] flex-col",
                  video.align === "center" && "items-center",
                  video.align === "right" && "ml-auto items-end",
                )}
              >
                {video.overlay.map((line) => (
                  <OverlayLine key={line.map((part) => part.text).join("-")} parts={line} />
                ))}
              </span>
            </span>
            <span className="absolute left-2.5 top-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[12px] font-medium text-white">
              {video.topic ?? video.genre}
            </span>
            <span
              className={cn(
                "absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[12px] font-medium leading-none text-white",
                video.live ? "bg-[#ff0000]" : "bg-black/80",
              )}
            >
              {video.live ? "LIVE" : video.duration}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from Watch later" : "Save to Watch later"}
          onClick={() => onToggleSave(video)}
          className={cn(
            "absolute bottom-9 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white",
            saved ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <ClockIcon filled={saved} className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => onOpen(video)}
          className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-raised"
          aria-label={video.channel}
        >
          <Image
            src={video.avatar}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpen(video)}
                className="line-clamp-2 text-left text-[16px] font-medium leading-snug text-ink"
              >
                {video.title}
              </button>
            </h3>
            <details className="relative shrink-0">
              <summary
                aria-label={`More actions for ${video.title}`}
                className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full text-ink opacity-0 marker:content-none hover-wash group-hover:opacity-100 focus-visible:opacity-100 [&::-webkit-details-marker]:hidden"
              >
                <MoreIcon className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-menu py-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => onToggleSave(video)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover-wash"
                >
                  <ClockIcon className="h-5 w-5" />
                  {saved ? "Remove from Watch later" : "Save to Watch later"}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLike(video)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover-wash"
                >
                  <ThumbUpIcon filled={liked} className="h-5 w-5" />
                  {liked ? "Remove from Liked videos" : "Add to Liked videos"}
                </button>
              </div>
            </details>
          </div>
          <p className="mt-1 text-[14px] text-muted">{video.channel}</p>
          <p className="text-[14px] text-muted">
            {video.views}
            <span aria-hidden="true"> • </span>
            {video.uploaded}
          </p>
        </div>
      </div>
    </article>
  );
}

export function VideoGrid({
  videos,
  savedIds,
  likedIds,
  onOpen,
  onToggleSave,
  onToggleLike,
}: {
  videos: Video[];
  savedIds: Set<string>;
  likedIds: Set<string>;
  onOpen: (video: Video) => void;
  onToggleSave: (video: Video) => void;
  onToggleLike: (video: Video) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 palm:grid-cols-2 desk:grid-cols-4">
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          preload={index < 4}
          saved={savedIds.has(video.id)}
          liked={likedIds.has(video.id)}
          onOpen={onOpen}
          onToggleSave={onToggleSave}
          onToggleLike={onToggleLike}
        />
      ))}
    </div>
  );
}
