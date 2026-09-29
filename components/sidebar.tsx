"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  FilmIcon,
  GamingIcon,
  HistoryIcon,
  HomeIcon,
  LearningIcon,
  LiveIcon,
  MusicIcon,
  NewsIcon,
  PlayTileIcon,
  PlaylistIcon,
  ShortsIcon,
  SparkIcon,
  SportsIcon,
  SubscriptionsIcon,
  ThumbUpIcon,
  UserIcon,
  Video360Icon,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import type { ExploreTopic, LibraryView } from "@/lib/videos";

export type SidebarChannel = {
  name: string;
  avatar: string;
};

type SidebarProps = {
  variant: "full" | "mini";
  library: LibraryView;
  explore: ExploreTopic | null;
  channels: SidebarChannel[];
  className?: string;
  contained?: boolean;
  inert?: boolean;
  onHome: () => void;
  onLibrary: (view: Exclude<LibraryView, "home">) => void;
  onExplore: (topic: ExploreTopic) => void;
  onChannel: (name: string) => void;
  onYou: () => void;
};

const miniItems = [
  { id: "home" as const, label: "Home", icon: HomeIcon },
  { id: "shorts" as const, label: "Shorts", icon: ShortsIcon },
  { id: "subscriptions" as const, label: "Subscriptions", icon: SubscriptionsIcon },
  { id: "you" as const, label: "You", icon: UserIcon },
];

const moreExplore: { id: ExploreTopic; label: string; icon: typeof MusicIcon }[] = [
  { id: "Live", label: "Live", icon: LiveIcon },
  { id: "Gaming", label: "Gaming", icon: GamingIcon },
  { id: "News", label: "News", icon: NewsIcon },
  { id: "Sports", label: "Sports", icon: SportsIcon },
  { id: "Courses", label: "Courses", icon: LearningIcon },
  { id: "360° Video", label: "360° Video", icon: Video360Icon },
];

function Row({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: typeof HomeIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex h-10 w-full items-center gap-6 rounded-lg px-3 text-left text-[14px] text-ink",
    active ? "bg-raised font-medium" : onClick ? "hover-wash" : "",
  );
  const body = (
    <>
      <Icon filled={active} className="h-6 w-6 shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );
  if (!onClick) {
    return <div className={className}>{body}</div>;
  }
  return (
    <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function Sidebar({
  variant,
  library,
  explore,
  channels,
  className,
  contained = false,
  inert,
  onHome,
  onLibrary,
  onExplore,
  onChannel,
  onYou,
}: SidebarProps) {
  const mini = variant === "mini";
  const homeActive = library === "home" && explore === null;
  const [exploreOpen, setExploreOpen] = useState(() =>
    moreExplore.some((item) => item.id === explore),
  );
  const [channelsOpen, setChannelsOpen] = useState(false);
  const visibleChannels = channelsOpen ? channels : channels.slice(0, 7);

  if (mini) {
    return (
      <aside
        inert={inert}
        className={cn(
          contained ? "absolute" : "fixed",
          "bottom-0 left-0 top-14 z-40 w-[72px] flex-col bg-canvas px-1 pt-1",
          className,
        )}
      >
        <nav aria-label="Main" className="flex flex-col items-center">
          {miniItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === "home"
                ? homeActive
                : item.id === "you"
                  ? false
                  : library === item.id && explore === null;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (item.id === "home") onHome();
                  else if (item.id === "you") onYou();
                  else onLibrary(item.id);
                }}
                className={cn(
                  "flex h-[74px] w-16 flex-col items-center justify-center gap-1.5 rounded-xl px-0.5 text-[10px] leading-none text-ink",
                  active ? "bg-raised font-medium" : "hover-wash",
                )}
              >
                <Icon filled={active} className="h-6 w-6 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      inert={inert}
      className={cn(
        contained ? "absolute" : "fixed",
        "bottom-0 left-0 top-14 z-40 w-60 flex-col bg-canvas px-3 pb-4",
        className,
      )}
    >
      <nav aria-label="Main" className="sidebar-scroll min-h-0 flex-1 overflow-y-auto pt-2">
        <ul className="space-y-0.5">
          <li>
            <Row icon={HomeIcon} label="Home" active={homeActive} onClick={onHome} />
          </li>
          <li>
            <Row
              icon={ShortsIcon}
              label="Shorts"
              active={library === "shorts"}
              onClick={() => onLibrary("shorts")}
            />
          </li>
        </ul>

        <div className="mx-3 my-2 h-px bg-line" />
        <button
          type="button"
          onClick={() => onLibrary("subscriptions")}
          className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-[16px] font-medium hover-wash"
        >
          Subscriptions
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        <ul className="space-y-0.5">
          {visibleChannels.map((channel, index) => (
            <li key={channel.name}>
              <button
                type="button"
                onClick={() => onChannel(channel.name)}
                className="flex h-10 w-full items-center gap-6 rounded-lg px-3 text-left text-[14px] hover-wash"
              >
                <Image
                  src={channel.avatar}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                {index !== 1 ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3ea6ff]" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0" />
                )}
              </button>
            </li>
          ))}
          {channels.length > 7 ? (
            <li>
              <button
                type="button"
                onClick={() => setChannelsOpen((open) => !open)}
                className="flex h-10 w-full items-center gap-6 rounded-lg px-3 text-left text-[14px] hover-wash"
              >
                <ChevronDownIcon className={cn("h-6 w-6 shrink-0", channelsOpen && "rotate-180")} />
                <span>{channelsOpen ? "Show less" : "Show more"}</span>
              </button>
            </li>
          ) : null}
        </ul>

        <div className="mx-3 my-2 h-px bg-line" />
        <div className="flex h-10 w-full items-center justify-between px-3 text-[16px] font-medium">
          You
          <ChevronRightIcon className="h-5 w-5" />
        </div>
        <ul className="space-y-0.5">
          <li>
            <Row icon={UserIcon} label="Your channel" />
          </li>
          <li>
            <Row icon={HistoryIcon} label="History" />
          </li>
          <li>
            <Row icon={PlaylistIcon} label="Playlists" />
          </li>
          <li>
            <Row
              icon={ClockIcon}
              label="Watch later"
              active={library === "watch-later"}
              onClick={() => onLibrary("watch-later")}
            />
          </li>
          <li>
            <Row
              icon={ThumbUpIcon}
              label="Liked videos"
              active={library === "liked"}
              onClick={() => onLibrary("liked")}
            />
          </li>
          <li>
            <Row icon={PlayTileIcon} label="Your videos" />
          </li>
          <li>
            <Row icon={DownloadIcon} label="Downloads" />
          </li>
        </ul>

        <div className="mx-3 my-2 h-px bg-line" />
        <p className="px-3 pb-1 pt-3 text-[16px] font-medium">More from YouTube</p>
        <ul className="space-y-0.5">
          <li>
            <Row icon={PlayTileIcon} label="YouTube Premium" />
          </li>
          <li>
            <Row icon={PlayTileIcon} label="YouTube TV" />
          </li>
          <li>
            <Row icon={MusicIcon} label="YouTube Music" />
          </li>
          <li>
            <Row icon={UserIcon} label="YouTube Kids" />
          </li>
        </ul>

        <div className="mx-3 my-2 h-px bg-line" />
        <p className="px-3 pb-1 pt-3 text-[16px] font-medium">Explore</p>
        <ul className="space-y-0.5">
          <li>
            <Row
              icon={MusicIcon}
              label="Music"
              active={explore === "Music"}
              onClick={() => onExplore("Music")}
            />
          </li>
          <li>
            <Row icon={FilmIcon} label="Movies & TV" />
          </li>
          <li>
            <Row icon={SparkIcon} label="Hype" />
          </li>
          {exploreOpen
            ? moreExplore.map((item) => (
                <li key={item.id}>
                  <Row
                    icon={item.icon}
                    label={item.label}
                    active={explore === item.id}
                    onClick={() => onExplore(item.id)}
                  />
                </li>
              ))
            : null}
          <li>
            <button
              type="button"
              onClick={() => setExploreOpen((open) => !open)}
              className="flex h-10 w-full items-center gap-6 rounded-lg px-3 text-left text-[14px] hover-wash"
            >
              <ChevronDownIcon className={cn("h-6 w-6 shrink-0", exploreOpen && "rotate-180")} />
              <span>{exploreOpen ? "Show less" : "Show more"}</span>
            </button>
          </li>
        </ul>

        <div className="mx-3 my-2 h-px bg-line" />
        <ul>
          <li>
            <Row icon={PlaylistIcon} label="Report history" />
          </li>
        </ul>
      </nav>
    </aside>
  );
}
