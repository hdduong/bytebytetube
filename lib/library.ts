import { cache } from "react";
import { asc, getTableColumns } from "drizzle-orm";
import { type ChannelProfile, type ChannelVideo } from "@/lib/channel";
import { db } from "@/lib/db";
import { channels, comments, users, videos } from "@/drizzle/schema";
import { exploreTopics, isGenre, type ExploreTopic, type Video } from "@/lib/videos";
import type { Comment } from "@/lib/watch";

function catalogColumns() {
  const { thumbnailEmbedding: _embedding, ...columns } = getTableColumns(videos);
  return columns;
}

type StoredVideo = Video & {
  source: string;
  viewCount: number;
  recency: number;
  sortOrder: number;
  channelSlug: string;
  likeCount: number;
};

function toVideo(row: Omit<typeof videos.$inferSelect, "thumbnailEmbedding">, channelSlug: string): StoredVideo {
  const genre = row.genre && isGenre(row.genre) ? row.genre : undefined;
  const topic = (exploreTopics as readonly string[]).includes(row.topic ?? "")
    ? (row.topic as ExploreTopic)
    : undefined;
  const align = row.align === "center" || row.align === "right" ? row.align : "left";

  return {
    id: row.slug,
    title: row.title,
    genre,
    topic,
    live: row.live || undefined,
    duration: row.duration,
    channel: row.channelName,
    avatar: row.avatar,
    views: row.views,
    uploaded: row.uploaded,
    thumbnail: row.thumbnail,
    overlay: row.overlay,
    align,
    shelf: row.shelf === "popular" ? "popular" : "fresh",
    newRelease: row.newRelease || undefined,
    spoilerFree: row.spoilerFree || undefined,
    topRated: row.topRated || undefined,
    subscribed: row.subscribed || undefined,
    unlisted: row.unlisted || undefined,
    source: row.source === "explore" || row.source === "channel" || row.source === "short" ? row.source : "feed",
    src: row.playback || `/videos/${row.slug}.mp4`,
    likeCount: row.likeCount,
    viewCount: row.viewCount,
    recency: row.recency,
    sortOrder: row.sortOrder,
    channelSlug,
  };
}

function toChannelVideo(video: StoredVideo): ChannelVideo {
  return {
    id: video.id,
    overlay: video.overlay[0]?.map((part) => part.text).join(" ") || video.title,
    title: video.title,
    views: video.views,
    viewCount: video.viewCount,
    uploaded: video.uploaded,
    recency: video.recency,
    duration: video.duration,
    genre: video.genre ?? "Drama",
    thumbnail: video.thumbnail,
  };
}

export type Library = {
  feed: Video[];
  explore: Video[];
  channelVideos: Video[];
  shorts: Video[];
  profiles: ChannelProfile[];
  commentsByVideoId: Record<string, Comment[]>;
  subscribersByChannel: Record<string, string>;
  likesByVideoId: Record<string, number>;
};

export const loadLibrary = cache(async (): Promise<Library> => {
  const [channelRows, videoRows, commentRows, userRows] = await Promise.all([
    db.select().from(channels).orderBy(asc(channels.name)),
    db.select(catalogColumns()).from(videos).orderBy(asc(videos.sortOrder)),
    db.select().from(comments).orderBy(asc(comments.sortOrder)),
    db.select().from(users),
  ]);

  const channelSlugById = new Map(channelRows.map((channel) => [channel.id, channel.slug]));
  const slugByVideoId = new Map(videoRows.map((video) => [video.id, video.slug]));
  const stored = videoRows.map((row) => toVideo(row, channelSlugById.get(row.channelId) ?? ""));
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const commentsByVideoId: Record<string, Comment[]> = {};

  for (const row of commentRows) {
    const author = usersById.get(row.userId);
    const videoSlug = slugByVideoId.get(row.videoId);
    if (!author || !videoSlug) continue;
    const comment: Comment = {
      id: row.id,
      name: author.name,
      handle: author.handle,
      avatar: author.avatar,
      text: row.body,
      posted: row.posted,
      likes: row.likes,
    };
    commentsByVideoId[videoSlug] ??= [];
    commentsByVideoId[videoSlug].push(comment);
  }

  const profiles: ChannelProfile[] = channelRows.map((channel) => {
    const mine = stored.filter((video) => video.channelSlug === channel.slug);
    const shorts = mine.filter((video) => video.source === "short").sort((a, b) => a.sortOrder - b.sortOrder);
    const longForm = mine
      .filter((video) => (video.source === "feed" || video.source === "channel") && !video.unlisted && !video.topic)
      .sort((a, b) => a.recency - b.recency);
    const live = mine.filter((video) => video.live && !video.unlisted);

    return {
      slug: channel.slug,
      name: channel.name,
      handle: channel.handle,
      avatar: channel.avatar,
      banner: channel.banner,
      bannerTitle: channel.bannerTitle,
      tagline: channel.tagline,
      bio: channel.bio,
      about: channel.about,
      subscribers: channel.subscribers,
      videoCount: channel.videoCount,
      videos: longForm.map(toChannelVideo),
      shorts: shorts.map(toChannelVideo),
      live: live.map(toChannelVideo),
    };
  });

  const asVideo = (video: StoredVideo): Video => {
    const {
      viewCount: _viewCount,
      recency: _recency,
      sortOrder: _sortOrder,
      channelSlug: _slug,
      likeCount: _likeCount,
      ...item
    } = video;
    return item;
  };

  return {
    feed: stored.filter((video) => video.source === "feed").map(asVideo),
    explore: stored.filter((video) => video.source === "explore").map(asVideo),
    channelVideos: stored.filter((video) => video.source === "channel").map(asVideo),
    shorts: stored.filter((video) => video.source === "short").map(asVideo),
    profiles,
    commentsByVideoId,
    subscribersByChannel: Object.fromEntries(channelRows.map((channel) => [channel.name, channel.subscribers])),
    likesByVideoId: Object.fromEntries(stored.map((video) => [video.id, video.likeCount])),
  };
});

export function channelCatalog(library: Library) {
  return [...library.feed, ...library.explore, ...library.channelVideos, ...library.shorts];
}
