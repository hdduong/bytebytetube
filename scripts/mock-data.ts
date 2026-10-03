import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { channels, comments, users, videos as videoTable } from "../drizzle/schema";
import { exploreTopics, genres, type ExploreTopic, type Genre } from "../lib/videos";
import type { OverlayPart } from "../lib/videos";

const avatars = [
  "/avatars/avatar-maya.png",
  "/avatars/avatar-forge.png",
  "/avatars/avatar-desk.png",
  "/avatars/avatar-nerd.png",
  "/avatars/avatar-screen.png",
  "/avatars/avatar-action.png",
  "/avatars/avatar-feelings.png",
  "/avatars/avatar-galaxy.png",
];

const thumbs = [
  "/thumbnails/thumb-worth-the-hype.png",
  "/thumbnails/thumb-pure-adrenaline.png",
  "/thumbnails/thumb-must-watch.png",
  "/thumbnails/thumb-scifi-done-right.png",
  "/thumbnails/thumb-stay-with-you.png",
  "/thumbnails/thumb-bigger-faster.png",
  "/thumbnails/thumb-its-the-people.png",
  "/thumbnails/thumb-brighter-tomorrow.png",
  "/thumbnails/thumb-comedy-diner.png",
  "/thumbnails/thumb-thriller-stairs.png",
  "/thumbnails/thumb-animation-sky.png",
  "/thumbnails/thumb-five-scifi.png",
  "/thumbnails/thumb-popular-moon.png",
  "/thumbnails/thumb-popular-highway.png",
  "/thumbnails/thumb-comedy-stage.png",
  "/thumbnails/thumb-thriller-street.png",
  "/thumbnails/thumb-animation-forest.png",
  "/thumbnails/thumb-popular-theater.png",
  "/thumbnails/thumb-popular-face.png",
];

const exploreThumb: Record<ExploreTopic, string> = {
  Gaming: "/thumbnails/explore-gaming.png",
  Music: "/thumbnails/explore-music.png",
  Live: "/thumbnails/explore-live.png",
  News: "/thumbnails/explore-news.png",
  Courses: "/thumbnails/explore-learning.png",
  Sports: "/thumbnails/explore-sports.png",
  "360° Video": "/thumbnails/explore-360.png",
};

const titlesByGenre: Record<Genre, string[]> = {
  Horror: [
    "The hallway that never ends",
    "A knock that answers back",
    "Don't rewind the last scene",
    "The house keeps the lights on",
    "Something waited in the cut",
    "The mirror blinked first",
    "Leave before the credits",
    "That lullaby is a warning",
    "The basement tape is worse",
    "One room stays locked",
  ],
  Action: [
    "The chase earns the ticket",
    "Three set pieces, one movie",
    "The bridge jump is the point",
    "Loud, and somehow precise",
    "The convoy scene still works",
    "A slow move across the set",
    "They built the stunt for real",
    "Speed without the empty noise",
    "The rooftop run is the review",
    "Every explosion has a reason",
  ],
  Drama: [
    "A small room, a long silence",
    "The performance carries it",
    "Two people and a kitchen table",
    "The letter arrives too late",
    "Quiet, and it stays with you",
    "The last look does the work",
    "A family argument, carefully shot",
    "The monologue is the movie",
    "Nothing explodes, everything matters",
    "The credits feel like a door",
  ],
  "Sci-Fi": [
    "The planet is the character",
    "A new world, same old question",
    "The ship has one rule",
    "They explained the science, mostly",
    "The future looks rented",
    "First contact, second thoughts",
    "The moon base has bad lighting",
    "Time travel with a receipt",
    "The robot gets the best line",
    "Orbit, then the argument",
  ],
  Comedy: [
    "The joke lands in the third act",
    "Mean, and then suddenly kind",
    "A dinner that will not end",
    "The bit is better than the plot",
    "They trusted the awkward pause",
    "One perfect throwaway line",
    "The reunion special is the movie",
    "Funny until the train scene",
    "The straight face does the work",
    "A farce with a soft center",
  ],
  Thriller: [
    "Trust the quiet one less",
    "The alibi has a hole",
    "Nobody leaves the station",
    "The phone call is the twist",
    "Follow the wrong suitcase",
    "A timetable and a lie",
    "The witness changes seats",
    "Lock the door, then listen",
    "The map is missing a street",
    "Someone already knows the ending",
  ],
  Animation: [
    "The cartoon that sneaks up on you",
    "Color does the storytelling",
    "A painted city, a real loss",
    "The sidekick gets the truth",
    "It moves like a memory",
    "Soft light above the trees",
    "A fable with sharp edges",
    "The creature is the heart",
    "Hand-drawn, and it shows",
    "The last frame is a gasp",
  ],
};

const shortHooks = [
  "Wait for the last second",
  "The line everyone missed",
  "One frame does the work",
  "Listen to the score here",
  "The cut is the joke",
  "Watch the background",
  "That reaction is the review",
  "Hold on the face",
];

const commenters = [
  ["Jules Hart", "@JulesHart"],
  ["Priya Sen", "@PriyaSen"],
  ["Owen Blake", "@OwenBlake"],
  ["Lana Ortiz", "@LanaOrtiz"],
  ["Chris Pell", "@ChrisPell"],
  ["Noor Rahman", "@NoorRahman"],
  ["Evan Cho", "@EvanCho"],
  ["Mia Laurent", "@MiaLaurent"],
  ["Hugo Berg", "@HugoBerg"],
  ["Sasha Quinn", "@SashaQuinn"],
  ["Imani Cole", "@ImaniCole"],
  ["Theo Marsh", "@TheoMarsh"],
  ["Greta Voss", "@GretaVoss"],
  ["Jonah Ellis", "@JonahEllis"],
  ["Amina Farid", "@AminaFarid"],
  ["Leo Park", "@LeoPark"],
];

const remarks = [
  (channel: string) => `This is the ${channel} video I send when someone asks where to start.`,
  (channel: string) => `Clear, specific, and ${channel} does not spoil the turn.`,
  () => "The middle drags, and the last five minutes fix it.",
  () => "I came for the clip and stayed for the argument.",
  () => "Rewound the example twice. That is a good sign.",
  () => "Disagree with the score, agree with the scene they picked.",
];

const channelSeeds = [
  ["Midnight Marquee", "Horror after midnight.", "Mina Calder", "@MinaCalder"],
  ["Frame Rate", "Action, counted in frames.", "Andre Cole", "@AndreCole"],
  ["Quiet Credits", "The movies that linger.", "Helen Cho", "@HelenCho"],
  ["Orbit Club", "New worlds, reviewed slowly.", "Rafi Osman", "@RafiOsman"],
  ["Punchline Room", "Comedy with the lights up.", "Bea Lorne", "@BeaLorne"],
  ["Locked Door", "Thrillers and bad alibis.", "Marcus Hale", "@MarcusHale"],
  ["Ink and Cell", "Animation, frame by frame.", "Yuki Mori", "@YukiMori"],
  ["Field Notes", "The context around the movie.", "Samir Adeyemi", "@SamirAdeyemi"],
] as const;

function redact(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCount(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1000) {
    const thousands = Math.round(value / 1000);
    return `${thousands}K`;
  }
  return String(value);
}

function overlay(title: string): OverlayPart[][] {
  const words = title.split(" ");
  const mid = Math.max(1, Math.ceil(words.length / 2));
  const second = words.slice(mid).join(" ");
  return [
    [{ text: words.slice(0, mid).join(" ").toUpperCase(), style: "poster" }],
    [{ text: (second || "REVIEW").toUpperCase(), style: "poster", tone: "red" }],
  ];
}

function duration(index: number, short: boolean) {
  if (short) return `0:${String(12 + ((index * 7) % 47)).padStart(2, "0")}`;
  const minutes = 4 + (index % 14);
  const seconds = (index * 13) % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function uploaded(index: number) {
  if (index === 0) return "1 day ago";
  if (index < 10) return `${index + 1} days ago`;
  if (index < 20) return `${Math.ceil(index / 7)} weeks ago`;
  return `${Math.max(1, Math.round(index / 30))} months ago`;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  const usedSlugs = new Set<string>();
  function uniqueSlug(title: string) {
    const base = slugify(title) || "video";
    let slug = base;
    let extra = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${extra}`;
      extra += 1;
    }
    usedSlugs.add(slug);
    return slug;
  }

  const ownerUsers = channelSeeds.map(([channelName, , ownerName, handle], index) => ({
    id: randomUUID(),
    name: ownerName,
    handle,
    avatar: avatars[index % avatars.length],
    channelName,
  }));
  const commentUsers = commenters.map(([name, handle], index) => ({
    id: randomUUID(),
    name,
    handle,
    avatar: avatars[(index + 3) % avatars.length],
  }));

  const channelRows = channelSeeds.map(([name, tagline, , handle], index) => {
    const owner = ownerUsers[index];
    return {
      id: randomUUID(),
      slug: slugify(name),
      name,
      handle,
      avatar: owner.avatar,
      banner: "/channel/banner.png",
      bannerTitle: name.toUpperCase(),
      tagline,
      bio: `${name} publishes fake movie-review metadata for the CinemaTube demo.`,
      about: `${owner.name} runs ${name}. ${tagline} The videos, comments, and counts on this channel are generated stand-ins.`,
      subscribers: `${80 + index * 37}K subscribers`,
      videoCount: 0,
      ownerId: owner.id,
    };
  });

  type VideoInsert = typeof videoTable.$inferInsert;
  const videoRows: VideoInsert[] = [];
  let feedOrder = 0;
  let exploreOrder = 0;
  let shortOrder = 0;
  const titleCursor: Record<Genre, number> = {
    Horror: 0,
    Action: 0,
    Drama: 0,
    "Sci-Fi": 0,
    Comedy: 0,
    Thriller: 0,
    Animation: 0,
  };

  function nextTitle(genre: Genre) {
    const pool = titlesByGenre[genre];
    const title = pool[titleCursor[genre] % pool.length];
    titleCursor[genre] += 1;
    return title;
  }

  channelRows.forEach((channel, channelIndex) => {
    for (let index = 0; index < 8; index += 1) {
      const genre = genres[(channelIndex + index) % genres.length];
      const title = nextTitle(genre);
      const views = 18_000 + channelIndex * 40_000 + index * 27_000;
      videoRows.push({
        id: randomUUID(),
        slug: uniqueSlug(title),
        channelId: channel.id,
        channelName: channel.name,
        title,
        genre,
        topic: null,
        live: false,
        duration: duration(channelIndex * 8 + index, false),
        views: `${formatCount(views)} views`,
        viewCount: views,
        uploaded: uploaded(index + channelIndex),
        recency: index,
        thumbnail: thumbs[(channelIndex * 3 + index) % thumbs.length],
        avatar: channel.avatar,
        overlay: overlay(title),
        align: (["left", "center", "right"] as const)[index % 3],
        shelf: index % 4 === 0 ? "popular" : "fresh",
        newRelease: index % 5 === 0,
        spoilerFree: index % 3 === 0,
        topRated: index % 4 === 1,
        subscribed: true,
        unlisted: false,
        source: "feed",
        likeCount: 400 + channelIndex * 220 + index * 85,
        sortOrder: feedOrder,
      });
      feedOrder += 1;
    }

    shortHooks.forEach((hook, index) => {
      const title = `${hook}`;
      const views = 8_000 + index * 11_000 + channelIndex * 3_000;
      videoRows.push({
        id: randomUUID(),
        slug: uniqueSlug(`${channel.slug}-${hook}`),
        channelId: channel.id,
        channelName: channel.name,
        title,
        genre: genres[channelIndex % genres.length],
        topic: null,
        live: false,
        duration: duration(index, true),
        views: `${formatCount(views)} views`,
        viewCount: views,
        uploaded: index === 0 ? "1 day ago" : `${index + 1} days ago`,
        recency: index,
        thumbnail: thumbs[(channelIndex + index) % thumbs.length],
        avatar: channel.avatar,
        overlay: overlay(title),
        align: "center",
        shelf: "fresh",
        newRelease: false,
        spoilerFree: true,
        topRated: false,
        subscribed: false,
        unlisted: true,
        source: "short",
        likeCount: 40 + index * 15,
        sortOrder: shortOrder,
      });
      shortOrder += 1;
    });
  });

  exploreTopics.forEach((topic, topicIndex) => {
    for (let copy = 0; copy < 2; copy += 1) {
      const channel = channelRows[(topicIndex + copy) % channelRows.length];
      const live = topic === "Live" && copy === 0;
      const title = live
        ? `${channel.name} is live tonight`
        : `${topic} notes from ${channel.name}`;
      const views = live ? 42_000 + topicIndex * 8_000 : 90_000 + topicIndex * 25_000 + copy * 12_000;
      videoRows.push({
        id: randomUUID(),
        slug: uniqueSlug(title),
        channelId: channel.id,
        channelName: channel.name,
        title,
        genre: null,
        topic,
        live,
        duration: live ? "LIVE" : duration(topicIndex + copy, false),
        views: live ? `${formatCount(views)} watching` : `${formatCount(views)} views`,
        viewCount: views,
        uploaded: live ? "Started 18 min ago" : uploaded(topicIndex + 2),
        recency: topicIndex,
        thumbnail: exploreThumb[topic],
        avatar: channel.avatar,
        overlay: overlay(live ? "We're live" : topic),
        align: "left",
        shelf: "fresh",
        newRelease: copy === 0,
        spoilerFree: true,
        topRated: false,
        subscribed: false,
        unlisted: false,
        source: "explore",
        likeCount: 120 + topicIndex * 40,
        sortOrder: exploreOrder,
      });
      exploreOrder += 1;
    }
  });

  for (const channel of channelRows) {
    channel.videoCount = videoRows.filter(
      (video) => video.channelId === channel.id && video.source !== "short",
    ).length;
  }

  const commentRows = videoRows.flatMap((video, videoIndex) =>
    [0, 1, 2].map((offset) => {
      const author = commentUsers[(videoIndex + offset) % commentUsers.length];
      const channelName = video.channelName;
      return {
        id: randomUUID(),
        videoId: video.id ?? "",
        userId: author.id,
        body: remarks[(videoIndex + offset) % remarks.length](channelName),
        posted: offset === 0 ? "1 day ago" : `${offset + 1} days ago`,
        likes: 12 + ((videoIndex * 17 + offset * 9) % 420),
        sortOrder: offset,
      };
    }),
  );

  await db.transaction(async (tx) => {
    await tx.delete(comments);
    await tx.delete(videoTable);
    await tx.delete(channels);
    await tx.delete(users);
    await tx.insert(users).values([...ownerUsers.map(({ channelName: _name, ...user }) => user), ...commentUsers]);
    await tx.insert(channels).values(channelRows);
    await tx.insert(videoTable).values(videoRows);
    await tx.insert(comments).values(commentRows);
  });

  const counts = await db.select({
    users: sql<number>`(select count(*)::int from users)`,
    channels: sql<number>`(select count(*)::int from channels)`,
    videos: sql<number>`(select count(*)::int from videos)`,
    comments: sql<number>`(select count(*)::int from comments)`,
  }).from(users).limit(1);

  console.log(
    `Replaced catalog with ${counts[0]?.users ?? 0} users, ${counts[0]?.channels ?? 0} channels, ${counts[0]?.videos ?? 0} videos, ${counts[0]?.comments ?? 0} comments`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(redact(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
