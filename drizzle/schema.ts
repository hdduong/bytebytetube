import { boolean, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { OverlayPart } from "@/lib/videos";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  avatar: text("avatar").notNull(),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  avatar: text("avatar").notNull(),
  banner: text("banner").notNull(),
  bannerTitle: text("banner_title").notNull(),
  tagline: text("tagline").notNull(),
  bio: text("bio").notNull(),
  about: text("about").notNull(),
  subscribers: text("subscribers").notNull(),
  videoCount: integer("video_count").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
});

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    channelName: text("channel_name").notNull(),
    title: text("title").notNull(),
    genre: text("genre"),
    topic: text("topic"),
    live: boolean("live").notNull().default(false),
    duration: text("duration").notNull(),
    views: text("views").notNull(),
    viewCount: integer("view_count").notNull(),
    uploaded: text("uploaded").notNull(),
    recency: integer("recency").notNull(),
    thumbnail: text("thumbnail").notNull(),
    avatar: text("avatar").notNull(),
    overlay: jsonb("overlay").$type<OverlayPart[][]>().notNull(),
    align: text("align").notNull(),
    shelf: text("shelf").notNull(),
    newRelease: boolean("new_release").notNull().default(false),
    spoilerFree: boolean("spoiler_free").notNull().default(false),
    topRated: boolean("top_rated").notNull().default(false),
    subscribed: boolean("subscribed").notNull().default(false),
    unlisted: boolean("unlisted").notNull().default(false),
    source: text("source").notNull(),
    likeCount: integer("like_count").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("videos_channel_id_idx").on(table.channelId), index("videos_source_idx").on(table.source)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    posted: text("posted").notNull(),
    likes: integer("likes").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("comments_video_id_idx").on(table.videoId)],
);
