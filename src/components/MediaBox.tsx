import Image from "next/image";

export interface MediaBoxAsset {
  url: string;
}

export interface MediaBoxFocalPoint {
  /** Fractional coordinates, 0–1, matching Sanity's hotspot format. */
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
}

/**
 * Single, shared surface for every image/video block on the site
 * (CLAUDE.md — "معماری کامپوننت مدیا"). Images get a one-time Ken Burns
 * zoom on load (scale 1 → 1.3, ~9s ease-in-out, around the focal point);
 * videos autoplay/muted/loop with no zoom. Both behaviors live only here
 * — call sites never change when phase 4+ swaps an image for a video.
 */
export default function MediaBox({
  type,
  asset,
  focalPoint,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
}: MediaBoxProps) {
  const objectPosition = focalPoint
    ? `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
    : "50% 50%";

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {type === "video" ? (
        <video
          src={asset.url}
          autoPlay
          muted
          loop
          playsInline
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
          className="media-box-zoom object-cover"
          style={{ objectPosition, transformOrigin: objectPosition }}
        />
      )}
    </div>
  );
}
