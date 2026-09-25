"use client";

import { useState } from "react";
import MediaBox, { type MediaBoxProps } from "./MediaBox";

interface ProductGalleryProps {
  images: MediaBoxProps[];
}

/**
 * Simple thumbnail-grid gallery — a large active photo plus a row of
 * clickable thumbnails, no external carousel library. Static (no zoom):
 * the Ken Burns effect is reserved for full-bleed hero surfaces.
 */
export default function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  const active = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div>
      <div className="bg-matte-black/5 relative aspect-[3/4] overflow-hidden">
        <MediaBox
          {...active}
          zoom={false}
          priority
          // One column of the product page's max-w-6xl (1152px) two-column
          // grid (px-6 padding, gap-16) on desktop; full width minus padding below.
          sizes="(min-width: 1152px) 520px, (min-width: 1024px) calc(50vw - 56px), calc(100vw - 48px)"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={`${image.asset.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-current={index === activeIndex}
              aria-label={image.alt}
              className={`relative aspect-[3/4] overflow-hidden transition-opacity ${
                index === activeIndex
                  ? "ring-matte-black opacity-100 ring-1"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <MediaBox {...image} zoom={false} sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
