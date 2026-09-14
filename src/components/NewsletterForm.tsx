"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Skeleton newsletter form — captures input locally only. Wiring to a
 * real subscriber list (Sanity, or an email provider) is a later phase.
 */
export default function NewsletterForm() {
  const t = useTranslations("footer.newsletter");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        {t("emailPlaceholder")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder={t("emailPlaceholder")}
        className="border-matte-black/30 text-matte-black placeholder:text-matte-black/50 focus:border-matte-black w-full min-w-0 flex-1 border bg-transparent px-4 py-2 text-sm focus:outline-none"
      />
      <button
        type="submit"
        className="border-matte-black hover:bg-matte-black hover:text-pearl-white border px-5 py-2 text-sm tracking-wide uppercase transition-colors"
      >
        {t("submit")}
      </button>
      {submitted && (
        <p role="status" className="text-matte-black/70 text-xs sm:hidden">
          ✓
        </p>
      )}
    </form>
  );
}
