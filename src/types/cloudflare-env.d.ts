// The authoritative, COMMITTED source of the CloudflareEnv bindings this
// project's code actually reads (src/db/client.ts, src/lib/adminAuth.ts,
// src/app/admin/actions.ts). Deliberately self-contained — it must not
// depend on `npm run cf-typegen`'s output (cloudflare-env.d.ts at the repo
// root), which is gitignored and only ever generated on a dev machine that
// has already run that command. A CI/Cloudflare build machine doing a
// clean `npm ci` + `next build` never runs it, so relying on it there
// silently drops every one of these properties (D1Database, KVNamespace,
// the secrets) — exactly what broke the first real Cloudflare deploy.
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    MEDIA: KVNamespace;
    // Secrets: .dev.vars locally, `wrangler secret put` in production —
    // never declared in wrangler.jsonc, so `wrangler types` wouldn't know
    // about them either way.
    ADMIN_PASSWORD: string;
    SESSION_SECRET: string;
    // Optional secret: Telegram bot for new-order notifications. When
    // unset, notifications are skipped (with a warning), never an error.
    TELEGRAM_BOT_TOKEN?: string;
    // Plain vars (wrangler.jsonc "vars"): public origin for absolute URLs
    // (metadataBase, OG images, sitemap), and the search-indexing switch —
    // anything but "true" keeps robots.txt at Disallow: /.
    SITE_URL?: string;
    ALLOW_INDEXING?: string;
    // Cloudflare Web Analytics token; empty/unset = no beacon.
    CF_WEB_ANALYTICS_TOKEN?: string;
    // Test-only override of https://api.telegram.org (e.g. a local mock).
    TELEGRAM_API_BASE?: string;
  }
}

export {};
