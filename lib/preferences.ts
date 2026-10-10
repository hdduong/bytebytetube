import type { Video } from "@/lib/videos";

export type Dimension = {
  id: string;
  label: string;
};

type TasteVideo = {
  title: string;
  genre?: string;
  topic?: string;
  channel: string;
  source?: string;
};

const named: Dimension[] = [
  { id: "horror", label: "Horror movies" },
  { id: "action", label: "Action movies" },
  { id: "drama", label: "Drama" },
  { id: "scifi", label: "Science fiction" },
  { id: "comedy", label: "Comedy" },
  { id: "thriller", label: "Thrillers" },
  { id: "animation", label: "Animation" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "live", label: "Live" },
  { id: "news", label: "News" },
  { id: "courses", label: "Courses" },
  { id: "sports", label: "Sports" },
  { id: "video-360", label: "360° video" },
  { id: "anime", label: "Anime" },
  { id: "starcraft", label: "StarCraft" },
  { id: "superheroes", label: "Superheroes" },
  { id: "midnight-marquee", label: "Midnight Marquee" },
  { id: "frame-rate", label: "Frame Rate" },
  { id: "quiet-credits", label: "Quiet Credits" },
  { id: "orbit-club", label: "Orbit Club" },
  { id: "punchline-room", label: "Punchline Room" },
  { id: "locked-door", label: "Locked Door" },
  { id: "ink-and-cell", label: "Ink and Cell" },
  { id: "field-notes", label: "Field Notes" },
  { id: "shorts", label: "Shorts" },
  { id: "haunted-houses", label: "Haunted houses" },
  { id: "hallways", label: "Hallways" },
  { id: "mirrors", label: "Mirrors" },
  { id: "basements", label: "Basements" },
  { id: "lullabies", label: "Lullabies" },
  { id: "knocks", label: "Knocks at the door" },
  { id: "chases", label: "Chases" },
  { id: "stunts", label: "Stunts" },
  { id: "rooftops", label: "Rooftops" },
  { id: "explosions", label: "Explosions" },
  { id: "convoys", label: "Convoys" },
  { id: "bridges", label: "Bridges" },
  { id: "speed", label: "Speed" },
  { id: "set-pieces", label: "Set pieces" },
  { id: "quiet-scenes", label: "Quiet scenes" },
  { id: "family", label: "Family stories" },
  { id: "kitchens", label: "Kitchen tables" },
  { id: "letters", label: "Letters" },
  { id: "monologues", label: "Monologues" },
  { id: "silence", label: "Silence" },
  { id: "planets", label: "Planets" },
  { id: "spaceships", label: "Spaceships" },
  { id: "robots", label: "Robots" },
  { id: "the-moon", label: "The Moon" },
  { id: "time-travel", label: "Time travel" },
  { id: "first-contact", label: "First contact" },
  { id: "jokes", label: "Jokes" },
  { id: "dinners", label: "Dinner scenes" },
  { id: "awkward", label: "Awkward humor" },
  { id: "farce", label: "Farce" },
  { id: "reunions", label: "Reunions" },
  { id: "alibis", label: "Alibis" },
  { id: "phone-calls", label: "Phone calls" },
  { id: "suitcases", label: "Suitcases" },
  { id: "witnesses", label: "Witnesses" },
  { id: "locked-rooms", label: "Locked rooms" },
  { id: "stations", label: "Train stations" },
  { id: "maps", label: "Maps" },
  { id: "endings", label: "Endings" },
  { id: "cartoons", label: "Cartoons" },
  { id: "painted-worlds", label: "Painted worlds" },
  { id: "creatures", label: "Creatures" },
  { id: "fables", label: "Fables" },
  { id: "hand-drawn", label: "Hand-drawn" },
  { id: "night", label: "Night" },
  { id: "credits", label: "Credits" },
  { id: "scores", label: "Scores" },
  { id: "faces", label: "Faces" },
  { id: "reactions", label: "Reactions" },
  { id: "capes", label: "Capes" },
  { id: "swarms", label: "Swarms" },
  { id: "build-orders", label: "Build orders" },
  { id: "openings", label: "Openings" },
  { id: "backgrounds", label: "Background detail" },
  { id: "last-seconds", label: "Last seconds" },
];

const titleRules: { id: string; words: string[] }[] = [
  { id: "haunted-houses", words: ["house", "lights"] },
  { id: "hallways", words: ["hallway"] },
  { id: "mirrors", words: ["mirror"] },
  { id: "basements", words: ["basement", "tape"] },
  { id: "lullabies", words: ["lullaby"] },
  { id: "knocks", words: ["knock"] },
  { id: "chases", words: ["chase"] },
  { id: "stunts", words: ["stunt"] },
  { id: "rooftops", words: ["rooftop"] },
  { id: "explosions", words: ["explosion", "explodes"] },
  { id: "convoys", words: ["convoy"] },
  { id: "bridges", words: ["bridge"] },
  { id: "speed", words: ["speed"] },
  { id: "set-pieces", words: ["set piece", "set pieces"] },
  { id: "quiet-scenes", words: ["quiet"] },
  { id: "family", words: ["family"] },
  { id: "kitchens", words: ["kitchen"] },
  { id: "letters", words: ["letter"] },
  { id: "monologues", words: ["monologue"] },
  { id: "silence", words: ["silence"] },
  { id: "planets", words: ["planet"] },
  { id: "spaceships", words: ["ship"] },
  { id: "robots", words: ["robot"] },
  { id: "the-moon", words: ["moon"] },
  { id: "time-travel", words: ["time travel"] },
  { id: "first-contact", words: ["first contact", "contact"] },
  { id: "jokes", words: ["joke"] },
  { id: "dinners", words: ["dinner"] },
  { id: "awkward", words: ["awkward"] },
  { id: "farce", words: ["farce"] },
  { id: "reunions", words: ["reunion"] },
  { id: "alibis", words: ["alibi"] },
  { id: "phone-calls", words: ["phone"] },
  { id: "suitcases", words: ["suitcase"] },
  { id: "witnesses", words: ["witness"] },
  { id: "locked-rooms", words: ["locked", "lock the door"] },
  { id: "stations", words: ["station"] },
  { id: "maps", words: ["map"] },
  { id: "endings", words: ["ending"] },
  { id: "cartoons", words: ["cartoon"] },
  { id: "painted-worlds", words: ["painted"] },
  { id: "creatures", words: ["creature"] },
  { id: "fables", words: ["fable"] },
  { id: "hand-drawn", words: ["hand-drawn"] },
  { id: "night", words: ["midnight", "night"] },
  { id: "credits", words: ["credits"] },
  { id: "scores", words: ["score"] },
  { id: "faces", words: ["face"] },
  { id: "reactions", words: ["reaction"] },
  { id: "capes", words: ["cape"] },
  { id: "swarms", words: ["swarm"] },
  { id: "build-orders", words: ["build order"] },
  { id: "openings", words: ["opening"] },
  { id: "backgrounds", words: ["background"] },
  { id: "last-seconds", words: ["last second"] },
  { id: "anime", words: ["opening theme", "filler episode", "anime"] },
  { id: "starcraft", words: ["build order", "swarm arrives", "starcraft"] },
  { id: "superheroes", words: ["cape", "superhero"] },
];

const genreIds: Record<string, string> = {
  Horror: "horror",
  Action: "action",
  Drama: "drama",
  "Sci-Fi": "scifi",
  Comedy: "comedy",
  Thriller: "thriller",
  Animation: "animation",
};

const topicIds: Record<string, string> = {
  Gaming: "gaming",
  Music: "music",
  Live: "live",
  News: "news",
  Courses: "courses",
  Sports: "sports",
  "360° Video": "video-360",
};

const channelIds: Record<string, string> = {
  "Midnight Marquee": "midnight-marquee",
  "Frame Rate": "frame-rate",
  "Quiet Credits": "quiet-credits",
  "Orbit Club": "orbit-club",
  "Punchline Room": "punchline-room",
  "Locked Door": "locked-door",
  "Ink and Cell": "ink-and-cell",
  "Field Notes": "field-notes",
};

export const dimensions: Dimension[] = named;

export function dimensionsForVideo(video: TasteVideo) {
  const title = video.title.toLowerCase();
  const ids = new Set<string>();
  const genre = video.genre ? genreIds[video.genre] : undefined;
  const topic = video.topic ? topicIds[video.topic] : undefined;
  const channel = channelIds[video.channel];
  if (genre) ids.add(genre);
  if (topic) ids.add(topic);
  if (channel) ids.add(channel);
  if (video.source === "short") ids.add("shorts");
  for (const rule of titleRules) {
    if (rule.words.some((word) => title.includes(word))) ids.add(rule.id);
  }
  return [...ids];
}

export type TasteEvent = {
  title: string;
  kind: "open" | "watch";
  at: number;
  dimensions: string[];
};

export type TasteProfile = {
  scores: Record<string, number>;
  opens: number;
  watchSeconds: number;
  last: TasteEvent | null;
};

const storageKey = "cinematube-taste";
const decay = 0.97;
const openBoost = 2;
const watchBoost = 1;

const emptyProfile = (): TasteProfile => ({
  scores: {},
  opens: 0,
  watchSeconds: 0,
  last: null,
});

function readProfile(): TasteProfile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as TasteProfile;
    return {
      scores: parsed.scores ?? {},
      opens: parsed.opens ?? 0,
      watchSeconds: parsed.watchSeconds ?? 0,
      last: parsed.last ?? null,
    };
  } catch {
    return emptyProfile();
  }
}

function writeProfile(profile: TasteProfile) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
  } catch {
    return;
  }
  window.dispatchEvent(new Event("cinematube-taste"));
}

export function loadTaste() {
  return readProfile();
}

export function clearTaste() {
  writeProfile(emptyProfile());
}

const recentOpens = new Map<string, number>();

export function recordTaste(video: Video, kind: "open" | "watch") {
  if (typeof window === "undefined") return readProfile();
  if (kind === "open") {
    const last = recentOpens.get(video.id) ?? 0;
    if (Date.now() - last < 1500) return readProfile();
    recentOpens.set(video.id, Date.now());
  }
  const profile = readProfile();
  const active = new Set(dimensionsForVideo(video));
  const boost = kind === "open" ? openBoost : watchBoost;
  const scores = { ...profile.scores };
  for (const dimension of dimensions) {
    const current = scores[dimension.id] ?? 0;
    scores[dimension.id] = active.has(dimension.id) ? current + boost : current * decay;
    if (scores[dimension.id] < 0.05) delete scores[dimension.id];
  }
  const next: TasteProfile = {
    scores,
    opens: profile.opens + (kind === "open" ? 1 : 0),
    watchSeconds: profile.watchSeconds + (kind === "watch" ? 5 : 0),
    last: { title: video.title, kind, at: Date.now(), dimensions: [...active] },
  };
  writeProfile(next);
  return next;
}

export function rankedTaste(profile: TasteProfile) {
  return dimensions
    .map((dimension) => ({ ...dimension, score: profile.scores[dimension.id] ?? 0 }))
    .filter((dimension) => dimension.score >= 0.05)
    .sort((left, right) => right.score - left.score);
}

export function recommendFromTaste(videos: Video[], profile: TasteProfile, limit = 8) {
  const top = rankedTaste(profile).slice(0, 3);
  if (top.length === 0) return { top, videos: [] as Video[] };
  const weights = new Map(top.map((dimension) => [dimension.id, dimension.score]));
  const picked = videos
    .map((video) => {
      const matched = dimensionsForVideo(video).filter((id) => weights.has(id));
      const score = matched.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
      return { video, score, hits: matched.length };
    })
    .filter((item) => item.hits > 0 && !item.video.unlisted)
    .sort((left, right) => right.hits - left.hits || right.score - left.score)
    .slice(0, limit)
    .map((item) => item.video);
  return { top, videos: picked };
}
