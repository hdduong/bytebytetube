"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeftIcon, BellIcon, MenuIcon, MicIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { PhoneToggle } from "@/components/phone-layout";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/cn";

type HeaderProps = {
  query: string;
  menuExpanded: boolean;
  phone?: boolean;
  onQueryChange: (value: string) => void;
  onToggleGuide: () => void;
  onHome: () => void;
};

export function Header({
  query,
  menuExpanded,
  phone = false,
  onQueryChange,
  onToggleGuide,
  onHome,
}: HeaderProps) {
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const restoreSearchFocus = useRef(false);
  const [panel, setPanel] = useState<"create" | "notifications" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panel) return;
    function onPointer(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setPanel(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  function closeSearch() {
    restoreSearchFocus.current = true;
    setSearchOpen(false);
  }

  useEffect(() => {
    if (searchOpen || !restoreSearchFocus.current) return;
    restoreSearchFocus.current = false;
    searchButtonRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeSearch();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [searchOpen]);

  return (
    <header
      className={cn(
        "z-50 flex h-14 items-center gap-2 bg-canvas px-2 palm:gap-4 palm:px-4",
        phone ? "sticky top-0 shrink-0" : "fixed inset-x-0 top-0",
      )}
    >
      {searchOpen ? (
        <div className="flex min-w-0 flex-1 items-center gap-1 palm:hidden">
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover-wash"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <form
            role="search"
            className="flex h-10 min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              event.currentTarget.querySelector("input")?.blur();
            }}
          >
            <label htmlFor={`${searchId}-mobile`} className="sr-only">
              Search movies, reviews, and creators
            </label>
            <input
              id={`${searchId}-mobile`}
              value={query}
              autoFocus
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search"
              className="h-full min-w-0 flex-1 rounded-full border border-line bg-field px-4 text-[16px] text-ink outline-none placeholder:text-muted"
            />
          </form>
        </div>
      ) : null}
      <div className={cn("flex min-w-0 flex-1 items-center gap-1 palm:gap-4", searchOpen && "hidden palm:flex")}>
        <div className="flex shrink-0 items-center gap-0.5 palm:gap-3">
          <button
            type="button"
            aria-label="Guide"
            aria-expanded={menuExpanded}
            onClick={onToggleGuide}
            className="grid h-10 w-10 place-items-center rounded-full hover-wash"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <a
            href="#top"
            className="flex items-center gap-1.5"
            aria-label="CinemaTube home"
            onClick={(event) => {
              event.preventDefault();
              onHome();
            }}
          >
            <span className="grid h-[22px] w-8 place-items-center rounded-[5px] bg-[#ff0000]">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-white" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="hidden text-[20px] font-bold leading-none tracking-[-0.04em] palm:inline">
              CinemaTube
            </span>
            <span className="hidden whitespace-nowrap text-[11px] font-medium tracking-[0.14em] text-muted wide:inline">
              MOVIE REVIEWS
            </span>
          </a>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 palm:gap-3">
          <form
            role="search"
            className="hidden h-10 min-w-0 w-full max-w-[640px] palm:flex"
            onSubmit={(event) => {
              event.preventDefault();
              inputRef.current?.blur();
            }}
          >
            <label htmlFor={searchId} className="sr-only">
              Search movies, reviews, and creators
            </label>
            <input
              ref={inputRef}
              id={searchId}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search movies, reviews, and creators"
              className="h-full min-w-0 flex-1 rounded-l-full border border-line bg-field px-4 text-[16px] text-ink outline-none placeholder:text-muted focus:border-[#1c62b9]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="grid w-12 shrink-0 place-items-center rounded-r-full border border-l-0 border-line bg-field-btn hover:bg-field-btn-hover palm:w-16"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </form>
          <button
            type="button"
            aria-label="Search with your voice"
            onClick={() => inputRef.current?.focus()}
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-raised hover:bg-raised-hover palm:grid"
          >
            <MicIcon className="h-5 w-5" />
          </button>
        </div>

        <div ref={panelRef} className="flex shrink-0 items-center justify-end gap-0 palm:gap-2">
          <button
            type="button"
            aria-label="Search"
            ref={searchButtonRef}
            onClick={() => {
              setPanel(null);
              setSearchOpen(true);
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover-wash palm:hidden"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
          <div className="relative hidden palm:block">
            <button
              type="button"
              aria-expanded={panel === "create"}
              onClick={() => setPanel((current) => (current === "create" ? null : "create"))}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium hover-wash"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create</span>
            </button>
            {panel === "create" ? (
              <div className="absolute right-0 top-12 w-64 rounded-xl border border-line bg-menu p-3 text-sm shadow-2xl">
                <p className="font-medium">Create a review</p>
                <p className="mt-1 text-muted">
                  Uploads aren’t part of this preview. Browse the feed and save reviews you want to revisit.
                </p>
              </div>
            ) : null}
          </div>

          <PhoneToggle />
          <ThemeSwitch />
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={panel === "notifications"}
              onClick={() =>
                setPanel((current) => (current === "notifications" ? null : "notifications"))
              }
              className="relative grid h-10 w-10 place-items-center rounded-full hover-wash"
            >
              <BellIcon className="h-6 w-6" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff0000]" />
            </button>
            {panel === "notifications" ? (
              <div className="absolute right-0 top-12 w-72 rounded-xl border border-line bg-menu p-4 text-sm shadow-2xl">
                <p className="font-medium">Notifications</p>
                <p className="mt-2 text-muted">You’re caught up. No new reviews.</p>
              </div>
            ) : null}
          </div>

          <Image
            src="/avatars/avatar-you.png"
            alt="Your channel"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
