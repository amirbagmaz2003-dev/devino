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
 * (CLAUDE.md — "معماری کامپوننت مدیا"). This phase only renders media
 * responsively around its focal point. The Ken Burns zoom (image) and
 * autoplay/muted/loop (video) behavior planned for phase 3 is added
 * inside this component alone — call sites never need to change.
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
          className="object-cover"
          style={{ objectPosition }}
        />
      )}
    </div>
  );
}
