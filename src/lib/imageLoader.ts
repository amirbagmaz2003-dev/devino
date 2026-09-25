/**
 * Custom next/image loader (brief 03, §8) — no paid image service needed.
 * Uploaded media (/media/<id>) has 800 and 1600px-wide JPEG variants in
 * KV next to the ≤2400px original, so each srcset width maps to the
 * smallest stored file that covers it; /media/[id] falls back to the
 * original when a variant doesn't exist (older uploads). Anything else
 * (static files under /public) is served as-is.
 */
export default function mediaImageLoader({ src, width }: { src: string; width: number }) {
  if (!src.startsWith("/media/")) return src;
  if (width <= 800) return `${src}?w=800`;
  if (width <= 1600) return `${src}?w=1600`;
  return src;
}
