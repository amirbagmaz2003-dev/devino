"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface MediaBoxAsset {
  url: string;
}

export interface MediaBoxFocalPoint {
  /** Fractional coordinates, 0–1, as set by the admin panel's focal-point picker. */
  x: number;
  y: number;
}

export interface MediaBoxProps {
  type: "image" | "video";
  asset: MediaBoxAsset;
  focalPoint?: MediaBoxFocalPoint;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Opt out of the continuous Ken Burns zoom for surfaces that want a
   * static image instead (e.g. collection grid cards — phase 4 brief asks
   * for "no zoom effect here, just a simple hover"). Videos never zoom
   * regardless of this prop. Defaults to true.
   */
  zoom?: boolean;
}

/**
 * Single, shared surface for every image/video block on the site
 * (CLAUDE.md — "معماری کامپوننت مدیا"). Images get a continuous,
 * back-and-forth Ken Burns zoom around the focal point (see globals.css
 * for the keyframes/timing); videos autoplay/muted/loop with no zoom.
 * Both behaviors live only here — call sites never change when phase 4+
 * swaps an image for a video.
 *
 * The zoom is paused (not unmounted) whenever the image scrolls out of
 * view, so it never keeps animating off-screen.
 */
export default function MediaBox({
  type,
  asset,
  focalPoint,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  zoom = true,
}: MediaBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(true);

  // Videos start from here rather than via the autoplay attribute, so
  // `prefers-reduced-motion: reduce` can keep them paused on the first
  // frame. (Images need nothing: the Ken Burns keyframes in globals.css
  // only apply under `prefers-reduced-motion: no-preference`.)
  useEffect(() => {
    if (type !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      video.muted = true; // required for autoplay; React doesn't SSR `muted`
      if (query.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        void video.play().catch(() => {
          // Autoplay refused (e.g. low-power mode): stays on the first frame.
        });
      }
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [type, asset.url]);

  useEffect(() => {
    if (type !== "image" || !zoom) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsInView(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [type, zoom]);

  const objectPosition = focalPoint
    ? `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
    : "50% 50%";

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      {type === "video" ? (
        <video
          ref={videoRef}
          src={asset.url}
          muted
          loop
          playsInline
          // Priority (hero) video loads eagerly; others only fetch metadata
          // until they play.
          preload={priority ? undefined : "metadata"}
          aria-label={alt}
          className="h-full w-full object-cover"
          style={{ objectPosition }}
        />
      ) : (
        <Image
          src={asset.url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          className={`object-cover ${zoom ? "media-box-zoom" : ""}`}
          style={{
            objectPosition,
            transformOrigin: objectPosition,
            animationPlayState: zoom && isInView ? "running" : "paused",
          }}
        />
      )}
    </div>
  );
}
