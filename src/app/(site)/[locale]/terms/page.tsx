import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return pageMetadata({
    locale,
    path: "/terms",
    title: t("title"),
    description: t("intro"),
  });
}

const STEPS = ["1", "2", "3", "4"] as const;
const PRICING = ["1", "2", "3"] as const;
const DATA = ["1", "2", "3", "4"] as const;

/** Terms & Privacy (brief 05) — styled like the About page. */
export default async function TermsPage({
  params,
}: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  const section = "mt-14 sm:mt-16";
  const heading = "font-heading text-2xl sm:text-3xl";
  const body =
    "text-matte-black/80 mt-5 text-base leading-loose sm:text-lg sm:leading-loose";
  const list =
    "text-matte-black/80 mt-5 space-y-3 text-base leading-loose sm:text-lg sm:leading-loose";

  return (
    <article className="mx-auto max-w-2xl px-6 pt-[calc(var(--header-h)+3rem)] pb-28">
      <h1 className="font-heading text-4xl sm:text-5xl">{t("title")}</h1>
      <p className={`${body} mt-8`}>{t("intro")}</p>

      <section aria-labelledby="terms-process" className={section}>
        <h2 id="terms-process" className={heading}>
          {t("process.heading")}
        </h2>
        <ol className={`${list} list-decimal ps-6`}>
          {STEPS.map((step) => (
            <li key={step}>{t(`process.steps.${step}`)}</li>
          ))}
        </ol>
        <p className={body}>{t("process.note")}</p>
      </section>

      <section aria-labelledby="terms-pricing" className={section}>
        <h2 id="terms-pricing" className={heading}>
          {t("pricing.heading")}
        </h2>
        <ul className={`${list} list-disc ps-6`}>
          {PRICING.map((item) => (
            <li key={item}>{t(`pricing.items.${item}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="terms-data" className={section}>
        <h2 id="terms-data" className={heading}>
          {t("data.heading")}
        </h2>
        <ul className={`${list} list-disc ps-6`}>
          {DATA.map((item) => (
            <li key={item}>{t(`data.items.${item}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="terms-stats" className={section}>
        <h2 id="terms-stats" className={heading}>
          {t("stats.heading")}
        </h2>
        <p className={body}>{t("stats.body")}</p>
      </section>

      <section aria-labelledby="terms-contact" className={section}>
        <h2 id="terms-contact" className={heading}>
          {t("contact.heading")}
        </h2>
        <p className={body}>
          {t.rich("contact.body", {
            link: (chunks) => (
              <Link
                href="/contact"
                className="hover:text-olive-accent underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>

      <p className="text-matte-black/60 mt-16 text-sm">{t("updated")}</p>
    </article>
  );
}
