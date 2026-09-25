import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/about",
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  });
}

const SECTIONS = ["why", "shoulder", "name"] as const;

export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <article className="mx-auto max-w-2xl px-6 pt-[calc(var(--header-h)+3rem)] pb-28">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("title")}</h1>

      {SECTIONS.map((section) => (
        <section key={section} aria-labelledby={`about-${section}`} className="mt-16 sm:mt-20">
          <h2 id={`about-${section}`} className="font-heading text-2xl sm:text-3xl">
            {t(`${section}.heading`)}
          </h2>
          <p className="text-matte-black/80 mt-5 text-base leading-loose sm:text-lg sm:leading-loose">
            {t(`${section}.body`)}
          </p>
        </section>
      ))}

      <footer className="mt-20 text-center sm:mt-24">
        <span aria-hidden className="bg-olive-accent mx-auto block h-px w-10" />
        <p className="font-heading mt-8 text-xl leading-relaxed italic sm:text-2xl">
          {t("closing")}
        </p>
      </footer>
    </article>
  );
}
