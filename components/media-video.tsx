"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";

type MediaVideoProps = ComponentProps<"video"> & { src: string; active?: boolean };

export const MediaVideo = forwardRef<HTMLVideoElement, MediaVideoProps>(function MediaVideo(
  { src, active = true, ...props },
  forwarded,
) {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwarded, () => ref.current as HTMLVideoElement);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!active) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }
    const stream = src.includes(".m3u8");
    if (!stream || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    let cancelled = false;
    let player: { destroy: () => void } | undefined;
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        video.src = src;
        return;
      }
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (video.autoplay) void video.play().catch(() => undefined);
      });
      player = hls;
    });
    return () => {
      cancelled = true;
      player?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, active]);

  return <video ref={ref} {...props} />;
});
