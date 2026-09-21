import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
    // Next's built-in optimizer needs sharp, which isn't available on the
    // Workers runtime, so nothing here can lean on it anyway — media
    // served from R2 (see src/app/media/[id]/route.ts) is served as-is.
    // Revisit if a Cloudflare Images binding is added later.
    unoptimized: true,
  },
};

// Gives `next dev` access to Cloudflare bindings (D1, R2) via
// getCloudflareContext(), matching the Workers runtime in local dev.
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
