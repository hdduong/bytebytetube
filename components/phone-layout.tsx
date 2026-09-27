"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type LayoutMode = "desktop" | "phone";

type LayoutModeValue = {
  phone: boolean;
  toggle: () => void;
};

const LayoutModeContext = createContext<LayoutModeValue>({
  phone: false,
  toggle: () => undefined,
});

export function LayoutModeProvider({
  mode,
  children,
}: {
  mode: LayoutMode;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<LayoutMode>(mode);
  const value = useMemo(
    () => ({
      phone: current === "phone",
      toggle: () => {
        setCurrent((previous) => {
          const next = previous === "phone" ? "desktop" : "phone";
          document.documentElement.dataset.layout = next;
          document.cookie = `cinematube-layout=${next}; path=/; max-age=31536000; samesite=lax`;
          return next;
        });
      },
    }),
    [current],
  );

  return <LayoutModeContext.Provider value={value}>{children}</LayoutModeContext.Provider>;
}

export function useLayoutMode() {
  return useContext(LayoutModeContext);
}

export function PhoneToggle() {
  const { phone, toggle } = useLayoutMode();

  return (
    <button
      type="button"
      aria-pressed={phone}
      aria-label={phone ? "Show desktop layout" : "Show phone layout"}
      onClick={toggle}
      className="grid h-10 w-10 place-items-center rounded-full hover-wash"
    >
      <PhoneIcon active={phone} />
    </button>
  );
}

function PhoneIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
      {active ? <path d="M4 8.5 7 12l-3 3.5" /> : null}
    </svg>
  );
}
