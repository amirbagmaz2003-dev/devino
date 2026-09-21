import { Link } from "@/i18n/navigation";
import MediaBox, { type MediaBoxProps } from "./MediaBox";

interface CollectionCardProps {
  name: string;
  slug: string;
  coverImage: MediaBoxProps | null;
}

/**
 * Collection grid card. Unlike the homepage hero, this cover image never
 * runs the Ken Burns zoom (phase 4 brief — "بدون افکت زوم اینجا") — the
 * only motion is a subtle CSS scale on hover, applied to the wrapper
 * rather than through MediaBox.
 */
export default function CollectionCard({ name, slug, coverImage }: CollectionCardProps) {
  return (
    <Link href={`/collections/${slug}`} className="group block">
      <div className="bg-matte-black/5 relative aspect-[4/5] overflow-hidden">
        {coverImage && (
          <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]">
            <MediaBox
              {...coverImage}
              zoom={false}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          </div>
        )}
      </div>
      <h3 className="font-heading mt-4 text-center text-xl sm:text-2xl">{name}</h3>
    </Link>
  );
}
