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
    // Next's built-in optimizer needs sharp, which the Workers runtime
    // doesn't have. Instead, uploads get 800/1600px variants in KV (made in
    // the browser at upload time) and this loader points each srcset width
    // at the smallest stored file that covers it.
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.ts",
    // srcset candidates == the stored sizes (800, 1600, original ≤2400),
    // so the browser always picks one of the files that actually exist.
    deviceSizes: [800, 1600, 2400],
    imageSizes: [],
  },
  experimental: {
    // Server actions default to a 1 MB body; hero videos may be up to 20 MB.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

// Gives `next dev` access to Cloudflare bindings (D1, KV) via
// getCloudflareContext(), matching the Workers runtime in local dev.
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
