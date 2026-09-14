import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
    // Next's built-in optimizer needs sharp, which isn't available on the
    // Workers runtime. Sanity's urlForImage() already serves resized,
    // auto-format CDN images, and Unsplash/Pexels URLs accept their own
    // sizing params — so nothing here loses real optimization. Revisit if
    // a Cloudflare Images binding is added later.
    unoptimized: true,
  },
};

// Gives `next dev` access to Cloudflare bindings (none in use yet) via
// getCloudflareContext(), matching the Workers runtime in local dev.
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
