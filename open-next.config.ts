import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override yet — this phase has no ISR/data fetching
// (see CLAUDE.md, "فاز فعلی پروژه"). Add the R2 incremental cache override
// here once pages start fetching Sanity content and need real caching:
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
