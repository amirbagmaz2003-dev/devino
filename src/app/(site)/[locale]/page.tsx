import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MediaBox from "@/components/MediaBox";
import HeroScrollController from "@/components/HeroScrollController";
import {
  heroPlaceholderUrl,
  heroPlaceholderFocalPoint,
} from "@/lib/placeholderHero";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <>
      <HeroScrollController />

      <section className="relative h-dvh w-full overflow-hidden">
        <MediaBox
          type="image"
          asset={{ url: heroPlaceholderUrl }}
          focalPoint={heroPlaceholderFocalPoint}
          alt={t("heroAlt")}
          priority
        />
        <div className="text-pearl-white relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="font-heading text-5xl md:text-6xl">{t("title")}</h1>
          <p className="font-heading mt-4 text-xl italic">{t("tagline")}</p>
        </div>
      </section>

      <section className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        <h2 className="text-3xl">{t("teaser.heading")}</h2>
        <p className="text-matte-black/70 mt-4">{t("teaser.body")}</p>
        <Link
          href="/collections"
          className="border-matte-black hover:bg-matte-black hover:text-pearl-white mt-8 border px-6 py-3 text-sm tracking-wide uppercase transition-colors"
        >
          {t("teaser.cta")}
        </Link>
      </section>
    </>
  );
}
