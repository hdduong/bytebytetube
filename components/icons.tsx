import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function Base({ filled, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="M16 16.5 20 20.5" />
    </Base>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="9" y="3.5" width="6" height="10" rx="3" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V20" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 16.5h12l-1.2-1.6V10a4.8 4.8 0 0 0-9.6 0v4.9L6 16.5Z" />
      <path d="M10 18.2a2 2 0 0 0 4 0" />
    </Base>
  );
}

export function HomeIcon({ filled, ...props }: IconProps) {
  return (
    <Base filled={filled} {...props}>
      {filled ? (
        <path d="M12 3.15 3 10.4V20a1 1 0 0 0 1 1h5.1v-6.1h5.8V21H20a1 1 0 0 0 1-1v-9.6L12 3.15Z" />
      ) : (
        <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.4Z" />
      )}
    </Base>
  );
}

export function ShortsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="7" y="3" width="10" height="18" rx="3" />
      <path d="m11 9.2 4.2 2.8L11 14.8v-5.6Z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function SubscriptionsIcon({ filled, ...props }: IconProps) {
  return (
    <Base filled={filled} {...props}>
      <rect x="3.5" y="6" width="14" height="11" rx="2" />
      <path d="M8 9.2h5M17.5 9.5 20.5 8v7l-3-1.5" />
    </Base>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 5.2V9h3.8M12 8.5V12l2.6 1.6" />
    </Base>
  );
}

export function ClockIcon({ filled, ...props }: IconProps) {
  return (
    <Base filled={filled} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" stroke={filled ? "var(--canvas)" : "currentColor"} />
    </Base>
  );
}

export function ThumbUpIcon({ filled, ...props }: IconProps) {
  return (
    <Base filled={filled} {...props}>
      <path d="M8 10.5v8H5.2A1.2 1.2 0 0 1 4 17.3v-5.6a1.2 1.2 0 0 1 1.2-1.2H8Z" />
      <path d="M8 10.5 11.2 4.8A2 2 0 0 1 14.6 6.4L13.8 10h4.5a2 2 0 0 1 2 2.3l-.7 5.2a2 2 0 0 1-2 1.7H8" />
    </Base>
  );
}

export function CommentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H9.5L6 19.2V16H5.5A1.5 1.5 0 0 1 4 14.5V8a1.5 1.5 0 0 1 1.5-1.5Z" />
    </Base>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="6" cy="12" r="2" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M8 11.2 15 8M8 12.8 15 16" />
    </Base>
  );
}

export function SkullIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 20v-2.2a6.8 6.8 0 1 1 8 0V20" />
      <path d="M9 20h2.2l.3-1.6h1l.3 1.6H15" />
      <circle cx="9.2" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
      <path d="M18 15.5 18.6 17.4 20.5 18 18.6 18.6 18 20.5 17.4 18.6 15.5 18 17.4 17.4 18 15.5Z" />
    </Base>
  );
}

export function MasksIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 8.5c0-2 1.6-3.2 4-3.2 1.6 0 2.7.6 3.5 1.6-1 .4-1.8 1.2-2.2 2.3-.8 2.2.2 4.4 2.2 5.4-1 .8-2.3 1.2-3.5 1.2-2.4 0-4-1.6-4-3.6V8.5Z" />
      <path d="M19.5 8.5c0-2-1.6-3.2-4-3.2-1.6 0-2.7.6-3.5 1.6 1 .4 1.8 1.2 2.2 2.3.8 2.2-.2 4.4-2.2 5.4 1 .8 2.3 1.2 3.5 1.2 2.4 0 4-1.6 4-3.6V8.5Z" />
    </Base>
  );
}

export function ComedyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 13.2c.9 1.7 2.1 2.5 3.5 2.5s2.6-.8 3.5-2.5" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function ThrillerIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6.2 6.8 12 6.8 21.5 12 21.5 12 17.8 17.2 12 17.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.3" />
    </Base>
  );
}

export function AnimationIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M12 8.2 13.1 11H16l-2.3 1.7.9 2.8L12 13.8 9.4 15.5l.9-2.8L8 11h2.9L12 8.2Z" />
    </Base>
  );
}

export function GamingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="8" width="18" height="9" rx="4.5" />
      <path d="M8 12.5h3M9.5 11v3" />
      <circle cx="15.4" cy="11.6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="17.3" cy="13.4" r="0.7" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 17.5V7l9-2v10.5" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="16" cy="15.5" r="2" />
    </Base>
  );
}

export function LiveIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M7.2 8.2a6.6 6.6 0 0 0 0 7.6M16.8 8.2a6.6 6.6 0 0 1 0 7.6" />
    </Base>
  );
}

export function NewsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 6.5h10.5A2.5 2.5 0 0 1 18 9v9.5H7.2A2.2 2.2 0 0 0 5 20.7V6.5Z" />
      <path d="M8 10.5h6M8 13.5h6" />
    </Base>
  );
}

export function LearningIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 9.5 12 5l9 4.5L12 14 3 9.5Z" />
      <path d="M7.2 11.6v3.6c1.5 1.1 3.1 1.7 4.8 1.7s3.3-.6 4.8-1.7v-3.6" />
    </Base>
  );
}

export function SportsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4c1.8 2.2 2.8 4.8 2.8 8s-1 5.8-2.8 8c-1.8-2.2-2.8-4.8-2.8-8s1-5.8 2.8-8Z" />
      <path d="M4.8 8.6h14.4M4.8 15.4h14.4" />
    </Base>
  );
}

export function Video360Icon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 9.2a5 5 0 0 1 7.2-1" />
      <path d="M15.2 8.2 13.6 10" />
      <path d="M16 14.8a5 5 0 0 1-7.2 1" />
      <path d="M8.8 15.8 10.4 14" />
    </Base>
  );
}

export function PlanetIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M4.2 14.2c2.2-4.8 13.4-6.2 15.6-1.2" />
      <path d="M5 9.6c3.8 3.2 10.8 3.6 14.4.4" />
    </Base>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m9 6 6 6-6 6" />
    </Base>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.2 18.5c1.1-2.3 3.2-3.4 5.8-3.4s4.7 1.1 5.8 3.4" />
    </Base>
  );
}

export function PlaylistIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 7h10M5 11h10M5 15h6" />
      <path d="m15 14 4 2.5-4 2.5V14Z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v10M8 10l4 4 4-4M6 18h12" />
    </Base>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M8 6 10 4M16 6l-2-2" />
    </Base>
  );
}

export function PlayTileIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 6 9 12l6 6" />
    </Base>
  );
}
