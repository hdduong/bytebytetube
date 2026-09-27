import { subscriberCount } from "@/lib/watch";
import type { Video } from "@/lib/videos";

export type ChannelGenre = "Sci-Fi" | "Action" | "Horror" | "Drama";

export type ChannelVideo = {
  id: string;
  overlay: string;
  title: string;
  views: string;
  viewCount: number;
  uploaded: string;
  recency: number;
  duration: string;
  genre: string;
  thumbnail: string;
};

export const channelGenres: Array<"All genres" | ChannelGenre> = [
  "All genres",
  "Sci-Fi",
  "Action",
  "Horror",
  "Drama",
];

export const nerdFramesVideos: ChannelVideo[] = [
  {
    id: "nf-scifi-done-right",
    overlay: "Sci-Fi Done Right",
    title: "A new sci-fi masterpiece?",
    views: "526K views",
    viewCount: 526000,
    uploaded: "7 days ago",
    recency: 0,
    duration: "10:12",
    genre: "Sci-Fi",
    thumbnail: "/channel/thumb-scifi.png",
  },
  {
    id: "nf-pure-adrenaline",
    overlay: "Pure Adrenaline",
    title: "The perfect action movie?",
    views: "289K views",
    viewCount: 289000,
    uploaded: "2 weeks ago",
    recency: 1,
    duration: "9:17",
    genre: "Action",
    thumbnail: "/channel/thumb-adrenaline.png",
  },
  {
    id: "nf-worth-the-hype",
    overlay: "Worth the Hype?",
    title: "The scariest film of the year?",
    views: "412K views",
    viewCount: 412000,
    uploaded: "3 weeks ago",
    recency: 2,
    duration: "8:24",
    genre: "Horror",
    thumbnail: "/channel/thumb-hype.png",
  },
  {
    id: "nf-must-watch",
    overlay: "A Must-Watch",
    title: "This ending stayed with me",
    views: "178K views",
    viewCount: 178000,
    uploaded: "3 weeks ago",
    recency: 3,
    duration: "7:36",
    genre: "Drama",
    thumbnail: "/channel/thumb-must-watch.png",
  },
  {
    id: "nf-five-scifi",
    overlay: "The Next Frontier",
    title: "Five sci-fi films you need to see",
    views: "198K views",
    viewCount: 198000,
    uploaded: "1 month ago",
    recency: 4,
    duration: "14:06",
    genre: "Sci-Fi",
    thumbnail: "/channel/thumb-frontier.png",
  },
  {
    id: "nf-its-the-people",
    overlay: "It's the People",
    title: "Small story. Massive heart.",
    views: "261K views",
    viewCount: 261000,
    uploaded: "1 month ago",
    recency: 5,
    duration: "6:58",
    genre: "Drama",
    thumbnail: "/channel/thumb-people.png",
  },
  {
    id: "nf-bigger-faster",
    overlay: "Bigger Faster Bolder",
    title: "Big action. Bigger stakes.",
    views: "215K views",
    viewCount: 215000,
    uploaded: "1 month ago",
    recency: 6,
    duration: "8:03",
    genre: "Action",
    thumbnail: "/channel/thumb-bolder.png",
  },
  {
    id: "nf-stay-with-you",
    overlay: "Some Films Stay With You",
    title: "Horror that stays with you",
    views: "320K views",
    viewCount: 320000,
    uploaded: "2 months ago",
    recency: 7,
    duration: "8:51",
    genre: "Horror",
    thumbnail: "/channel/thumb-stay.png",
  },
];

const profiles: Record<
  string,
  { handle: string; tagline: string; bio: string; about: string; banner?: string; videoCount?: number }
> = {
  "nerd-frames": {
    handle: "@NerdFrames",
    tagline: "Great movies. Bigger conversations.",
    bio: "Honest reviews, deep dives, and a love for great cinema.",
    about:
      "Nerd Frames is a movie-review channel for people who want the conversation, not just a score. Honest reviews, deep dives, and a love for great cinema.",
    banner: "/channel/banner.png",
    videoCount: 86,
  },
  "cine-with-maya": {
    handle: "@CineWithMaya",
    tagline: "Spoiler-free, until you ask.",
    bio: "Spoiler-free horror, thrillers, and the films that linger.",
    about: "Maya reviews the films that stay with you, and keeps the ending to herself unless the title says otherwise.",
  },
  "film-forge": {
    handle: "@FilmForge",
    tagline: "Action, tested.",
    bio: "Set pieces, stakes, and whether the movie earns them.",
    about: "FilmForge breaks down action movies: what works, what is just noise, and what is worth the ticket.",
  },
  "the-movie-desk": {
    handle: "@TheMovieDesk",
    tagline: "The desk notes.",
    bio: "Quiet films, big performances, and why they still matter.",
    about: "The Movie Desk covers drama and the performances people argue about after the credits.",
  },
  "screen-talk": {
    handle: "@ScreenTalk",
    tagline: "Horror, talked through.",
    bio: "The scares, the craft, and the ones that get under your skin.",
    about: "ScreenTalk talks through horror without pretending every jump scare is a great movie.",
  },
  "action-analyst": {
    handle: "@ActionAnalyst",
    tagline: "Was the chase worth it?",
    bio: "Chases, fights, and whether the action is actually good.",
    about: "Action Analyst watches the set pieces closely and says when the movie is just loud.",
  },
  "real-feelings": {
    handle: "@RealFeelings",
    tagline: "Heart first.",
    bio: "Small stories, big feelings, and comedies with something underneath.",
    about: "Real Feelings reviews the movies that are really about people, including the funny ones.",
  },
  "galaxy-reviews": {
    handle: "@GalaxyReviews",
    tagline: "New worlds, reviewed.",
    bio: "Science fiction, animation, and the futures that look too good.",
    about: "Galaxy Reviews covers sci-fi and animation, from the spectacle to the story underneath.",
  },
};

export function channelSlug(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function viewCount(views: string) {
  const match = views.match(/([\d.]+)\s*([KM])?/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2]?.toUpperCase();
  if (unit === "M") return Math.round(amount * 1_000_000);
  if (unit === "K") return Math.round(amount * 1_000);
  return Math.round(amount);
}

function toChannelVideo(video: Video, recency: number): ChannelVideo {
  return {
    id: video.id,
    overlay: video.overlay[0]?.map((part) => part.text).join(" ") || video.title,
    title: video.title,
    views: video.views,
    viewCount: viewCount(video.views),
    uploaded: video.uploaded,
    recency,
    duration: video.duration,
    genre: video.genre ?? "Drama",
    thumbnail: video.thumbnail,
  };
}

export type ChannelProfile = {
  slug: string;
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bannerTitle: string;
  tagline: string;
  bio: string;
  about: string;
  subscribers: string;
  videoCount: number;
  videos: ChannelVideo[];
};

export function getChannel(slug: string, catalog: Video[]): ChannelProfile | null {
  const copy = profiles[slug];
  if (!copy) return null;
  if (slug === "nerd-frames") {
    return {
      slug,
      name: "Nerd Frames",
      handle: copy.handle,
      avatar: "/channel/avatar.png",
      banner: copy.banner ?? nerdFramesVideos[0].thumbnail,
      bannerTitle: "NERD FRAMES",
      tagline: copy.tagline,
      bio: copy.bio,
      about: copy.about,
      subscribers: subscriberCount("Nerd Frames"),
      videoCount: copy.videoCount ?? nerdFramesVideos.length,
      videos: nerdFramesVideos,
    };
  }
  const owned = catalog.filter(
    (video) => !video.unlisted && !video.topic && channelSlug(video.channel) === slug,
  );
  if (owned.length === 0) return null;
  const name = owned[0].channel;
  return {
    slug,
    name,
    handle: copy.handle,
    avatar: owned[0].avatar,
    banner: owned[0].thumbnail,
    bannerTitle: name.toUpperCase(),
    tagline: copy.tagline,
    bio: copy.bio,
    about: copy.about,
    subscribers: subscriberCount(name),
    videoCount: owned.length,
    videos: owned.map((video, index) => toChannelVideo(video, index)),
  };
}

export function nerdFramesCatalog(): Video[] {
  return nerdFramesVideos.map((video) => ({
    id: video.id,
    title: video.title,
    genre: video.genre as Video["genre"],
    duration: video.duration,
    channel: "Nerd Frames",
    avatar: "/channel/avatar.png",
    views: video.views,
    uploaded: video.uploaded,
    thumbnail: video.thumbnail,
    overlay: [[{ text: video.overlay, style: "poster" }]],
    align: "left",
    shelf: "fresh",
    spoilerFree: true,
    unlisted: true,
  }));
}
