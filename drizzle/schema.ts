import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { OverlayPart } from "@/lib/videos";

function when(name: string) {
  return timestamp(name, { withTimezone: true, mode: "date" });
}

export const CLIP_DIMENSIONS = 512;

const vector512 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "extensions.vector(512)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return String(value)
      .replace(/^\[|\]$/g, "")
      .split(",")
      .filter(Boolean)
      .map(Number);
  },
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  handle: text("handle").notNull().unique(),
  avatar: text("avatar").notNull().default(""),
  admin: boolean("admin").notNull().default(false),
  createdAt: when("created_at").notNull().defaultNow(),
  updatedAt: when("updated_at").notNull().defaultNow(),
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
    playback: text("playback"),
    thumbnailEmbedding: vector512("thumbnail_embedding"),
    sampleKey: doublePrecision("sample_key").default(sql`random()`),
  },
  (table) => [
    index("videos_channel_id_idx").on(table.channelId),
    index("videos_source_idx").on(table.source),
    uniqueIndex("videos_thumbnail_key").on(table.thumbnail),
  ],
);

export const videoLikes = pgTable(
  "video_likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    createdAt: when("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.videoId] }), index("video_likes_video_id_idx").on(table.videoId)],
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

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: when("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: when("created_at").notNull().defaultNow(),
    updatedAt: when("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: when("access_token_expires_at"),
    refreshTokenExpiresAt: when("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: when("created_at").notNull().defaultNow(),
    updatedAt: when("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: when("expires_at").notNull(),
    createdAt: when("created_at").notNull().defaultNow(),
    updatedAt: when("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
