interface ContactChannel {
  label: string;
  href: string;
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
}: ContactChannelsProps) {
  const channels: ContactChannel[] = [
    phone ? { label: phoneLabel, href: `tel:${phone}` } : null,
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
                className="font-heading hover:text-olive-accent decoration-matte-black/25 inline-flex min-h-12 items-center text-2xl underline underline-offset-8 transition-colors sm:text-3xl"
              >
                {channel.label}
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
