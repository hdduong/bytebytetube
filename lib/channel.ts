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
  genre: ChannelGenre;
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

export function nerdFramesCatalog(): Video[] {
  return nerdFramesVideos.map((video) => ({
    id: video.id,
    title: video.title,
    genre: video.genre,
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
