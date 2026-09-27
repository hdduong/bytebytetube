import type { Video } from "@/lib/videos";

export type Comment = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  posted: string;
  likes: number;
};

const subscribersByChannel: Record<string, string> = {
  "Nerd Frames": "128K subscribers",
  "Galaxy Reviews": "86K subscribers",
  CineWithMaya: "240K subscribers",
  FilmForge: "96K subscribers",
  "The Movie Desk": "154K subscribers",
  "Real Feelings": "73K subscribers",
  ScreenTalk: "61K subscribers",
  "Action Analyst": "118K subscribers",
};

const likesByVideo: Record<string, number> = {
  "scifi-done-right": 12400,
};

const featuredComments: Comment[] = [
  {
    id: "maya-comment",
    name: "Maya at the Movies",
    handle: "@MayaAtTheMovies",
    avatar: "/avatars/avatar-maya.png",
    text: "The visuals were incredible, but the soundtrack stole the show.",
    posted: "2 days ago",
    likes: 342,
  },
  {
    id: "alex-comment",
    name: "Alex Reviews",
    handle: "@AlexReviews",
    avatar: "/avatars/avatar-forge.png",
    text: "Finally, a review that keeps the surprises intact. Added to my watchlist!",
    posted: "3 days ago",
    likes: 186,
  },
  {
    id: "sam-comment",
    name: "Cinema Sam",
    handle: "@CinemaSam",
    avatar: "/avatars/avatar-screen.png",
    text: "That final shot deserves to be seen on the biggest screen possible.",
    posted: "4 days ago",
    likes: 97,
  },
];

export function subscriberCount(channel: string) {
  return subscribersByChannel[channel] ?? "48K subscribers";
}

export function baseLikeCount(video: Video) {
  return likesByVideo[video.id] ?? 860;
}

export function watchTitle(video: Video) {
  if (video.live) return video.title;
  if (video.spoilerFree) return `${video.title} | Spoiler-free review`;
  return video.title;
}

export function watchDescription(video: Video) {
  if (video.id === "scifi-done-right") {
    return "A stunning new world, big ideas, and a story worth talking about. Here is my spoiler-free review.";
  }
  if (video.topic) {
    return `${video.channel} breaks down this ${video.topic} video, what works, and what is worth your time.`;
  }
  const label = video.genre ?? "movie";
  return `${video.channel} reviews this ${label.toLowerCase()} film: what works, what doesn't, and who it is for. ${
    video.spoilerFree ? "No ending details." : "A few story points are discussed."
  }`;
}

export function watchDescriptionMore(video: Video) {
  return `${watchDescription(video)} Filmed for CinemaTube. Chapters, sources, and the creator's watchlist are in the full notes.`;
}

export function commentsFor(video: Video): Comment[] {
  if (video.id === "scifi-done-right") return featuredComments;
  return [
    {
      id: `${video.id}-1`,
      name: "Maya at the Movies",
      handle: "@MayaAtTheMovies",
      avatar: "/avatars/avatar-maya.png",
      text: `This is the ${video.channel} video I send to people who ask where to start.`,
      posted: "1 day ago",
      likes: 128,
    },
    {
      id: `${video.id}-2`,
      name: "Alex Reviews",
      handle: "@AlexReviews",
      avatar: "/avatars/avatar-forge.png",
      text: "Clear, specific, and not trying to spoil the fun. More of this.",
      posted: "3 days ago",
      likes: 64,
    },
  ];
}

export function formatCount(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    const rounded = thousands >= 100 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${rounded.replace(/\.0$/, "")}K`;
  }
  return String(value);
}

const featuredRecommendationIds = [
  "brighter-tomorrow",
  "worth-the-hype",
  "pure-adrenaline",
  "must-watch",
  "its-the-people",
  "five-scifi",
];

export function recommendedVideos(video: Video, catalog: Video[], filter: "all" | "same" | "channel") {
  const others = catalog.filter((item) => item.id !== video.id && !item.topic);
  if (filter === "channel") return others.filter((item) => item.channel === video.channel);
  const listed = others.filter((item) => !item.unlisted);
  if (filter === "same") {
    return listed.filter((item) => (video.topic ? item.topic === video.topic : item.genre === video.genre));
  }
  if (video.id === "scifi-done-right") {
    return featuredRecommendationIds
      .map((id) => listed.find((item) => item.id === id))
      .filter((item): item is Video => Boolean(item));
  }
  const same = listed.filter((item) => item.genre && item.genre === video.genre);
  const rest = listed.filter((item) => item.genre !== video.genre);
  return [...same, ...rest].slice(0, 8);
}
