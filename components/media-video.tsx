"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";

type MediaVideoProps = ComponentProps<"video"> & { src: string };

export const MediaVideo = forwardRef<HTMLVideoElement, MediaVideoProps>(function MediaVideo(
  { src, ...props },
  forwarded,
) {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwarded, () => ref.current as HTMLVideoElement);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
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
      player = hls;
    });
    return () => {
      cancelled = true;
      player?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return <video ref={ref} {...props} />;
});
