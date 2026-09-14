import type { SanityImageObject } from "@sanity/image-url";
import type { MediaBoxProps } from "@/components/MediaBox";
import { urlForImage } from "./image";

/**
 * Shape a `mediaBox` field resolves to once a GROQ query dereferences its
 * video asset (`video.asset->{url}`). Not used by phase 2 pages yet — this
 * is the mapping later phases will call when they start fetching real
 * Sanity content into <MediaBox />.
 */
export interface RawMediaBoxValue {
  type: "image" | "video";
  image?: SanityImageObject;
  video?: { asset?: { url?: string } };
  alt: string;
}

export function resolveMediaBox(value: RawMediaBoxValue): MediaBoxProps {
  if (value.type === "video") {
    return {
      type: "video",
      asset: { url: value.video?.asset?.url ?? "" },
      alt: value.alt,
    };
  }

  return {
    type: "image",
    asset: {
      url: value.image
        ? urlForImage(value.image).width(2000).auto("format").url()
        : "",
    },
    focalPoint: value.image?.hotspot,
    alt: value.alt,
  };
}
