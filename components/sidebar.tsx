import {
  AnimationIcon,
  ClockIcon,
  ComedyIcon,
  GamingIcon,
  HomeIcon,
  LearningIcon,
  LiveIcon,
  MasksIcon,
  MusicIcon,
  NewsIcon,
  PlanetIcon,
  SportsIcon,
  ThrillerIcon,
  Video360Icon,
  ShortsIcon,
  SkullIcon,
  SparkIcon,
  SubscriptionsIcon,
  ThumbUpIcon,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import type { ExploreTopic, Genre, LibraryView } from "@/lib/videos";

type SidebarProps = {
  variant: "full" | "mini";
  library: LibraryView;
  genre: Genre | null;
  explore: ExploreTopic | null;
  className?: string;
  contained?: boolean;
  inert?: boolean;
  onHome: () => void;
  onLibrary: (view: Exclude<LibraryView, "home">) => void;
  onGenre: (genre: Genre) => void;
  onExplore: (topic: ExploreTopic) => void;
};

const primary = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "shorts", label: "Shorts", icon: ShortsIcon },
  { id: "subscriptions", label: "Subscriptions", icon: SubscriptionsIcon },
  { id: "watch-later", label: "Watch later", icon: ClockIcon },
  { id: "liked", label: "Liked videos", icon: ThumbUpIcon },
] as const;

const genreItems: { id: Genre; label: string; icon: typeof SkullIcon }[] = [
  { id: "Horror", label: "Horror", icon: SkullIcon },
  { id: "Action", label: "Action", icon: SparkIcon },
  { id: "Drama", label: "Drama", icon: MasksIcon },
  { id: "Sci-Fi", label: "Sci-Fi", icon: PlanetIcon },
  { id: "Comedy", label: "Comedy", icon: ComedyIcon },
  { id: "Thriller", label: "Thriller", icon: ThrillerIcon },
  { id: "Animation", label: "Animation", icon: AnimationIcon },
];

const exploreItems: { id: ExploreTopic; label: string; icon: typeof SkullIcon }[] = [
  { id: "Gaming", label: "Gaming", icon: GamingIcon },
  { id: "Music", label: "Music", icon: MusicIcon },
  { id: "Live", label: "Live", icon: LiveIcon },
  { id: "News", label: "News", icon: NewsIcon },
  { id: "Learning", label: "Learning", icon: LearningIcon },
  { id: "Sports", label: "Sports", icon: SportsIcon },
  { id: "360° Video", label: "360° Video", icon: Video360Icon },
];

export function Sidebar({
  variant,
  library,
  genre,
  explore,
  className,
  contained = false,
  inert,
  onHome,
  onLibrary,
  onGenre,
  onExplore,
}: SidebarProps) {
  const mini = variant === "mini";

  return (
    <aside
      inert={inert}
      className={cn(
        contained ? "absolute" : "fixed",
        "bottom-0 left-0 top-14 z-40 flex-col bg-canvas pb-4",
        mini ? "w-[72px] px-1" : "w-60 px-3",
        className,
      )}
    >
      <nav aria-label="Main" className="sidebar-scroll min-h-0 flex-1 overflow-y-auto pt-2">
        <ul className="space-y-0.5">
          {primary.map((item) => {
            const Icon = item.icon;
            const active =
              item.id === "home"
                ? library === "home" && genre === null && explore === null
                : library === item.id && explore === null;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (item.id === "home") onHome();
                    else onLibrary(item.id);
                  }}
                  className={cn(
                    "flex w-full items-center text-[14px] text-ink",
                    mini
                      ? "h-[74px] flex-col justify-center gap-1.5 rounded-xl px-1 text-[10px]"
                      : "h-10 gap-6 rounded-lg px-3",
                    active
                      ? "bg-raised font-medium"
                      : "hover-wash",
                  )}
                >
                  <Icon filled={active} className="h-6 w-6 shrink-0" />
                  <span className={cn(!mini && "truncate")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          className={cn(
            "px-3 pb-1 pt-5 text-[15px] font-medium text-ink",
            mini && "sr-only",
          )}
        >
          Explore
        </p>
        <ul className="space-y-0.5">
          {exploreItems.map((item) => {
            const Icon = item.icon;
            const active = explore === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onExplore(item.id)}
                  className={cn(
                    "flex w-full items-center text-[14px] text-ink",
                    mini
                      ? "h-[74px] flex-col justify-center gap-1.5 rounded-xl px-1 text-[10px]"
                      : "h-10 gap-6 rounded-lg px-3",
                    active
                      ? "bg-raised font-medium"
                      : "hover-wash",
                  )}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className={cn(!mini && "truncate")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p
          className={cn(
            "px-3 pb-1 pt-5 text-[15px] font-medium text-ink",
            mini && "sr-only",
          )}
        >
          Explore genres
        </p>
        <ul className="space-y-0.5">
          {genreItems.map((item) => {
            const Icon = item.icon;
            const active = library === "home" && genre === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onGenre(item.id)}
                  className={cn(
                    "flex w-full items-center text-[14px] text-ink",
                    mini
                      ? "h-[74px] flex-col justify-center gap-1.5 rounded-xl px-1 text-[10px]"
                      : "h-10 gap-6 rounded-lg px-3",
                    active
                      ? "bg-raised font-medium"
                      : "hover-wash",
                  )}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className={cn(!mini && "truncate")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

      </nav>
      <div className={cn("px-3 pb-6 pt-4", mini && "hidden")}>
        <p className="text-[15px] leading-snug text-ink">
          <span className="block">Great movies.</span>
          <span className="block">Bigger conversations.</span>
        </p>
        <span className="mt-3 block h-[3px] w-10 rounded-full bg-[#ff0000]" />
      </div>
    </aside>
  );
}
