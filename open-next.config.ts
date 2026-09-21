import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override yet — the D1-backed pages are all
// force-dynamic (content can change via /admin at any time), so there's no
// ISR output to cache. Add the R2 incremental cache override here if that
// changes: https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
