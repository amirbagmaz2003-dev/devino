import type { Metadata } from "next";
import "../globals.css";

/**
 * Separate root layout for the whole /admin tree — not localized (no
 * [locale] segment, excluded from next-intl's middleware matcher), not on
 * the brand palette on purpose (CLAUDE.md / migration brief: an internal
 * tool, priority is usability over the site's visual identity).
 */
export const metadata: Metadata = {
  title: "deVino Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-dvh bg-zinc-100 font-sans text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
