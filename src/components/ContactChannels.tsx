import { toPersianDigits } from "@/lib/jalali";

interface ContactChannel {
  label: string;
  href: string;
  /** Visible detail under the label (the phone number itself). */
  detail?: string;
}

interface ContactChannelsProps {
  heading?: string;
  description?: string;
  phone?: string | null;
  telegramUrl?: string | null;
  instagramUrl?: string | null;
  phoneLabel: string;
  telegramLabel: string;
  instagramLabel: string;
  /** Contact page: larger, stacked links as the page's main content. */
  prominent?: boolean;
  /** For the phone number's digits (Persian on /fa). */
  locale?: "fa" | "en";
}

/**
 * The number as people read it: Iranian mobiles grouped 0912 345 6789
 * (or +98 912 345 6789); anything else is shown as entered.
 */
function formatPhone(phone: string, locale: "fa" | "en") {
  const compact = phone.replace(/[\s-]/g, "");
  const local = /^09\d{9}$/.exec(compact)?.[0];
  const intl = /^\+989\d{9}$/.exec(compact)?.[0];
  const grouped = local
    ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
    : intl
      ? `+98 ${intl.slice(3, 6)} ${intl.slice(6, 9)} ${intl.slice(9)}`
      : phone.trim();
  return locale === "fa" ? toPersianDigits(grouped) : grouped;
}

/**
 * Quiet, understated order-inquiry section for the product page — never a
 * bold CTA button (CLAUDE.md / phase-4 brief: the site is display-only,
 * not an instant-purchase storefront). All three channels come from the
 * site_settings table (editable in /admin), never hardcoded here; a
 * channel with no value set is simply omitted.
 */
export default function ContactChannels({
  heading,
  description,
  phone,
  telegramUrl,
  instagramUrl,
  phoneLabel,
  telegramLabel,
  instagramLabel,
  prominent = false,
  locale = "en",
}: ContactChannelsProps) {
  const channels: ContactChannel[] = [
    phone
      ? {
          label: phoneLabel,
          href: `tel:${phone}`,
          detail: formatPhone(phone, locale),
        }
      : null,
    telegramUrl ? { label: telegramLabel, href: telegramUrl } : null,
    instagramUrl ? { label: instagramLabel, href: instagramUrl } : null,
  ].filter((channel): channel is ContactChannel => channel !== null);

  if (channels.length === 0) return null;

  if (prominent) {
    return (
      <ul className="mt-10 space-y-2">
        {channels.map((channel) => {
          const isExternal = !channel.href.startsWith("tel:");
          return (
            <li key={channel.label}>
              <a
                href={channel.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="group hover:text-olive-accent inline-flex min-h-12 flex-col items-start justify-center transition-colors"
              >
                <span className="font-heading decoration-matte-black/25 text-2xl underline underline-offset-8 sm:text-3xl">
                  {channel.label}
                </span>
                {/* Visible on every screen size: on desktop there's no
                    tap-to-call, so the number itself must be readable. */}
                {channel.detail && (
                  <span
                    dir="ltr"
                    className="text-matte-black/70 group-hover:text-olive-accent mt-3 text-base tracking-wide transition-colors"
                  >
                    {channel.detail}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="border-matte-black/15 mt-10 border-t pt-6">
      {heading && <h2 className="font-heading text-base">{heading}</h2>}
      {description && (
        <p className="text-matte-black/60 mt-1 text-sm">{description}</p>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {channels.map((channel) => {
          const isExternal = !channel.href.startsWith("tel:");
          return (
            <li key={channel.label}>
              <a
                href={channel.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="hover:text-olive-accent decoration-matte-black/20 underline underline-offset-4 transition-colors"
              >
                {channel.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
