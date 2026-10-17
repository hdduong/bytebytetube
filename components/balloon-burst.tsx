"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const BALLOON_COUNT = 120;

type Balloon = {
  id: number;
  left: number;
  size: number;
  drift: string;
  rise: string;
  sway: string;
  delay: number;
  duration: number;
  spin: string;
  scale: number;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createBalloons(): Balloon[] {
  return Array.from({ length: BALLOON_COUNT }, (_, id) => {
    const spread = Math.random();
    const left = spread * 100;
    const outward = left < 50 ? -1 : 1;
    const drift = outward * (6 + Math.random() * 36) * (Math.random() < 0.22 ? -1 : 1);
    return {
      id,
      left,
      size: 16 + Math.random() * 36,
      drift: `${drift.toFixed(2)}vw`,
      rise: `${(70 + Math.random() * 50).toFixed(1)}vh`,
      sway: `${((Math.random() - 0.5) * 56).toFixed(1)}px`,
      delay: Math.round(Math.random() * 380),
      duration: Math.round(1400 + Math.random() * 1500),
      spin: `${((Math.random() - 0.5) * 80).toFixed(1)}deg`,
      scale: Number((0.7 + Math.random() * 0.95).toFixed(2)),
    };
  });
}

export function BalloonBurst({ onDone }: { onDone: () => void }) {
  const [balloons] = useState(createBalloons);
  const onDoneRef = useRef(onDone);
  const finished = useRef(false);
  const pending = useRef(balloons.length);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onDoneRef.current();
  }

  useEffect(() => {
    const longest = balloons.reduce((max, balloon) => Math.max(max, balloon.delay + balloon.duration), 0);
    const timer = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current();
    }, Math.max(longest + 400, 8000));
    return () => window.clearTimeout(timer);
  }, [balloons]);

  const overlay = (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" data-balloon-burst="" aria-hidden="true">
      {balloons.map((balloon) => {
        const style: CSSProperties & Record<`--${string}`, string> = {
          left: `${balloon.left}%`,
          fontSize: balloon.size,
          animationDelay: `${balloon.delay}ms`,
          animationDuration: `${balloon.duration}ms`,
          "--balloon-drift": balloon.drift,
          "--balloon-rise": balloon.rise,
          "--balloon-sway": balloon.sway,
          "--balloon-spin": balloon.spin,
          "--balloon-scale": String(balloon.scale),
        };
        return (
          <span
            key={balloon.id}
            data-balloon=""
            className="balloon-burst absolute bottom-0 select-none"
            style={style}
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.animationName !== "balloon-burst") return;
              pending.current -= 1;
              if (pending.current <= 0) finish();
            }}
          >
            🎈
          </span>
        );
      })}
    </div>
  );

  return createPortal(overlay, document.body);
}

export function BrokenHeart({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  const finished = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onDoneRef.current();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onDoneRef.current();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      <span
        data-broken-heart=""
        className="broken-heart absolute bottom-[18%] left-1/2 select-none text-[40px]"
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.animationName !== "broken-heart") return;
          finish();
        }}
      >
        💔
      </span>
    </div>,
    document.body,
  );
}

export function useSubscribeCelebration() {
  const [effect, setEffect] = useState<{ id: number; kind: "balloons" | "heart" } | null>(null);

  function celebrateSubscribe() {
    if (prefersReducedMotion()) return;
    setEffect((current) => ({ id: (current?.id ?? 0) + 1, kind: "balloons" }));
  }

  function celebrateUnsubscribe() {
    if (prefersReducedMotion()) return;
    setEffect((current) => ({ id: (current?.id ?? 0) + 1, kind: "heart" }));
  }

  const effectId = effect?.id;
  const celebration =
    effect?.kind === "balloons" ? (
      <BalloonBurst key={effect.id} onDone={() => setEffect((current) => (current?.id === effectId ? null : current))} />
    ) : effect?.kind === "heart" ? (
      <BrokenHeart key={effect.id} onDone={() => setEffect((current) => (current?.id === effectId ? null : current))} />
    ) : null;

  return { celebrateSubscribe, celebrateUnsubscribe, celebration };
}
