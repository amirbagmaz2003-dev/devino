import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeDirection, type Locale } from "@/i18n/routing";
import { headingFont, bodyFont, headingFontFa, bodyFontFa } from "@/lib/fonts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteSettings } from "@/db/queries";
import { getSiteUrl, getWebAnalyticsToken } from "@/lib/site";
import { BRAND_NAME, pageMetadata } from "@/lib/seo";
import "../../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Every page reads live D1 data (site settings in the footer and header
// tagline at minimum), so nothing here is prerendered at build time — an
// admin edit shows up on the next request.
export const dynamic = "force-dynamic";

/**
 * Site-wide defaults: metadataBase from SITE_URL (so every relative URL in
 * page metadata — canonical, hreflang, OG images — becomes absolute), the
 * "%s | deVino" title template, and the home page's own title/description.
 * Pages override title/description/alternates/OG with their own.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const [t, settings, siteUrl] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getSiteSettings(),
    getSiteUrl(),
  ]);
  const brand = settings?.brandName?.trim() || BRAND_NAME;
  const home = pageMetadata({
    locale,
    path: "/",
    description: t("homeDescription"),
  });
  return {
    ...home,
    metadataBase: new URL(siteUrl),
    title: { default: brand, template: `%s | ${brand}` },
    applicationName: brand,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  // Public site only — the /admin tree has its own root layout, so the
  // beacon never loads there. Cookieless; nothing rendered without a token.
  const analyticsToken = await getWebAnalyticsToken();

  const heading = locale === "fa" ? headingFontFa : headingFont;
  const body = locale === "fa" ? bodyFontFa : bodyFont;

  return (
    <html
      lang={locale}
      dir={localeDirection[locale as Locale]}
      className={`${heading.variable} ${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
        {analyticsToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: analyticsToken })}
          />
        )}
      </body>
    </html>
  );
}
