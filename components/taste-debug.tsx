"use client";

import { useEffect, useState } from "react";
import { clearTaste, dimensions, loadTaste, rankedTaste, type TasteProfile } from "@/lib/preferences";

export function TasteDebug() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<TasteProfile>({ scores: {}, opens: 0, watchSeconds: 0, last: null });

  useEffect(() => {
    const refresh = () => setProfile(loadTaste());
    refresh();
    window.addEventListener("cinematube-taste", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cinematube-taste", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const ranked = rankedTaste(profile);
  const top = ranked[0]?.score ?? 1;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 items-center rounded-full px-2 text-sm font-medium hover-wash"
      >
        Taste
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-line bg-menu p-4 text-sm shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">What we know about you</p>
              <p className="mt-1 text-muted">
                {dimensions.length} dimensions. {ranked.length} have a score.
              </p>
            </div>
            <button type="button" onClick={() => clearTaste()} className="text-muted hover:text-ink">
              Clear
            </button>
          </div>
          <p className="mt-3 text-muted">
            {profile.opens} opens · {profile.watchSeconds}s watched
          </p>
          {profile.last ? (
            <p className="mt-1 text-muted">
              Last signal: {profile.last.kind === "open" ? "opened" : "watched 5s of"} {profile.last.title}
            </p>
          ) : (
            <p className="mt-1 text-muted">Open a video to start a taste profile.</p>
          )}
          <ul className="mt-3 space-y-2">
            {ranked.length === 0 ? <li className="text-muted">No preferences yet.</li> : null}
            {ranked.map((dimension) => (
              <li key={dimension.id}>
                <div className="flex justify-between gap-3">
                  <span>{dimension.label}</span>
                  <span className="text-muted">{dimension.score.toFixed(1)}</span>
                </div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#ff4e45]"
                    style={{ width: `${Math.max(8, (dimension.score / top) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
