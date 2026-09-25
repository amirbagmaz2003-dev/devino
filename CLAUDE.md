# Project: deVino Website

## Communication
- The project owner (Amir) is a native Persian speaker. **Always write your final reports/summaries to him in Persian.** Code, comments, commit messages and technical notes stay in English.
- Prompts will usually arrive in English. Any user-facing text quoted in Persian inside a prompt (labels, button text, messages) must be used verbatim — do not translate or rephrase it.

## About the Brand
deVino is a premium women's evening-wear brand. Target audience: women aged 25–35. Tagline: «حضوری از آنِ خودش» / "A Presence of Her Own." Brand voice: a blend of formal and poetic. Visual identity: minimal, dramatic, feminine — never exaggerated, never loud.

## Color Palette (final — three colors only)
- Primary 1 (dark background/text) — Matte Black: `#000000`
- Primary 2 (light background/text) — Pearlescent White: `#F8F6F0`
- Accent (only for very small, rare touches — an icon, a thin line, a tiny detail; never as a background or the dominant color of a section) — Olive Green: `#556B2F`

No other colors are used. The entire visual identity of the site is built on black / pearlescent-white contrast. Olive green should be used so sparingly that users discover it as a subtle signature, not as a main design color.

**Important note about the full brand book:** The complete brand book (`deVino_Brandbook_v06_2.docx`) is also provided with this project and is the primary reference for the brand's philosophy, voice, persona and collection design logic. However, the brand book's full palette (which includes 4 additional complementary colors — grape purple, lemon yellow, blue, dark crimson — used to categorize physical products) is **intentionally** not used on the website. The deliberate decision is that the website shows only part of the brand identity, not all of it. Use only the three colors above in the web design, even though the brand book defines more colors for the collections themselves.

## Typography
- Headings (English): Cormorant Garamond (delicate serif)
- Body (English): Inter
- Headings (Persian): Markazi Text (replaces Cormorant Garamond, which has no Persian glyphs)
- Body (Persian): Vazirmatn (replaces Inter)

## Tech Stack (approved — final)
- Framework: Next.js (App Router)
- Styling: Tailwind CSS
- CMS / admin panel: **Cloudflare D1 + a custom admin panel** (not Sanity — Sanity is a third-party service requiring separate signup and tokens, and Claude Code's environment had no network access to api.sanity.io; D1 is Cloudflare's own database, needing no extra account or token). This is the same pattern successfully used in the owner's other project ("Baboneh") — a simple, custom admin panel for managing content without coding.
- Media storage: **Cloudflare Workers KV** (binding `MEDIA`; the `media.r2_key` column actually holds a KV key). **R2 is not available on this account** (it requires a payment method the owner can't add), so media stays in KV. Video uploads are capped at **20 MB** (KV's per-value limit is 25 MiB); images get 800/1600px JPEG variants stored next to the original (`media:<id>:800`, `media:<id>:1600`). `/media/<id>` supports HTTP Range (needed by iOS Safari for video), ETag/304 and `?w=800|1600`.
- Hosting: **Cloudflare Workers** (not Vercel — Vercel requires a payment method that is currently not possible for the owner; the Cloudflare account is already active and free). Next.js is deployed via the OpenNext adapter (`@opennextjs/cloudflare`). Official docs: developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- Custom Worker entry: `wrangler.jsonc` `main` is `src/worker.ts`, which serves GET/HEAD `/media/<id>` directly from KV (`src/lib/serveMedia.ts`) and passes every other request to the OpenNext handler unchanged — because OpenNext re-streams Next.js route responses as chunked without `Content-Length`, which iOS Safari's video playback doesn't tolerate.
- Domain: `devinomaison.ir` — purchased from Nic.ir. **Important: the main domain must not be connected to any deployment until the owner explicitly says so.** All development and review happens only on the temporary preview URL that Cloudflare Workers generates automatically (e.g. `xxx.workers.dev`).

**Quality standard:** Implementation must be at the highest level of quality and follow current best practices for each of these tools — not a simplified or minimal version. This includes performance optimization, accessibility, clean and maintainable code structure, and full responsiveness at every screen size.

## Media Component Architecture (important — must be followed from the start)
Every image/video section of the site (especially the header) must use a shared component called `MediaBox`, never a raw `<img>` or `<video>` tag. The component gets these fields from the database (Cloudflare D1):
- `type`: "image" or "video"
- `asset`: URL of the image or video file
- `focalPoint`: the focal point, as two simple percentage values (x, y), adjustable in the admin upload form (a simple click-on-image tool or two numeric fields — design the details yourself; the goal is that a non-technical user can easily set the point)

Component behavior:
- If `type === "image"`: run a slow zoom effect (Ken Burns — scale from 1 to ~1.3 over several seconds, ease-in-out) around the `focalPoint`.
- If `type === "video"`: play the video autoplay, muted, loop, with the zoom effect disabled.

Goal: in the future, replacing an image with a video must be done by changing a single field in the admin panel, with no code changes.

## Header Scroll Behavior
When the user scrolls from the header to the next section, the background color must change smoothly and continuously (not in jumps) from dark (black/night) to a lighter tone (for the collections section). This change must be directly synchronized with the user's scroll position (scroll-linked), not an independent timed animation.

## Logo
Two transparent logo files (PNG with alpha) exist in the project and replace the temporary text logo `DEVINO` in the header and footer:
- `devino-logo-black-transparent.png` — for use on light backgrounds
- `devino-logo-white-transparent.png` — for use on dark backgrounds

Because the header background changes smoothly from dark to light on scroll (see "Header Scroll Behavior"), the logo component must switch between these two versions in sync with the same scroll position (e.g. with a short crossfade), not stay fixed.

## Carousels (collection posters and products within a collection)
- `/collections` page: each collection is a full-screen poster (no Ken Burns effect — just a static image + gradient + name/description/"View Collection" button)
- `/collections/[slug]` page: products are shown one at a time (not a multi-item grid) — the card is larger on desktop, but always exactly one product per slide, at every screen size
- **Arrow direction:** contrary to the original decision, arrow direction is no longer flipped based on RTL/LTR — the left arrow always = previous, the right arrow always = next, identically in both languages (Persian and English). Button positions are fixed with physical `left-`/`right-`, not logical `start-`/`end-`
- **Infinite loop:** both carousels (collection posters and products) have `loop: true` — from the last slide it wraps to the first, and vice versa
- Combined navigation: buttons + mouse/touch drag + arrow keys, using the Embla Carousel library
- **Movement direction:** Carousel movement is identical in both languages (always LTR track); only slide content follows the locale direction.

## Current Project Phase
Phases 0 through 4 are complete. The site is live on Cloudflare Workers: https://devino.amirbagmaz2003.workers.dev — bilingual (Persian default `/fa`, English `/en`), with a live header (hero zoom + scroll color transition + real logo), a custom admin panel at `/admin` (D1, not Sanity), and collection/product pages as poster sliders (instead of the simple grid from the original Phase 4, per the brief `poster-carousel-collections-brief.md`).

Real data (not just placeholders) has been entered through the admin panel: several products (named after grape/wine varieties — the brand's official naming pattern for products) and three collections (برداشت اول / First Harvest, غروب شراب / Evening Pour, وینتیج / Vintage).

**Fixed — RTL carousel bug:** in the Persian version (`/fa`) both carousels used to show only the first slide (the rest were empty, and the poster went blank after switching language). Fixed by making the carousel track always LTR in both locales (Embla `direction: "ltr"` + `dir="ltr"` on the Embla viewport), while each slide's content follows the locale direction (`dir` from `localeDirection` on the slide's inner wrapper). Separately, one product (`petit-verdot`) was saved with no image at all (a data issue, not a code issue).

## Important Notes on Working with Claude Code (must be followed)
- Prompts must be precise and limited to the relevant files; always state explicitly "don't touch the rest of the project, don't re-review from scratch" to keep token usage low
- Large/multi-part changes → a separate brief file; small, specific changes → direct text in the message (not a file)
- Claude Code has no network access to any external domain (including the live site itself) or to the real Cloudflare/Sanity APIs — for tasks like creating a database/bucket or running a real migration, either Claude (in chat) does it through its direct Cloudflare access, or the owner does it manually in the Cloudflare dashboard
- Files the owner wants Claude Code to use (logo, product photos) must be uploaded as **real file attachments** in the same Claude Code session, not just as images inside a chat message (this mistake has been repeated several times and wasted time)

## Additional Phase 2 Decision: Bilingual Site
The site is built bilingual: Persian (`/fa`, default) and English (`/en`), with next-intl, dynamic rtl/ltr direction, and a font fallback for Persian headings (since Cormorant Garamond has no Persian glyphs). This decision must be respected in all later phases (visual design, content, admin panel) — i.e. any content defined in the database (D1) must have separate fields for both languages.

## Scope of Version 1 (important)
The first version of the site is built **without** a shopping cart or online payment — brand presentation, collections, and **order requests**. A visitor places an order request from a piece's page (`/order?product=<slug>`: name, mobile, size, province, city, address, postal code); each order is saved in D1 (`orders`, with the product name and price snapshotted at order time), sent to the team on Telegram, and confirmed by phone (size, shipping cost, delivery time), with payment arranged during that call. There are no fittings or bookings. A payment gateway is a later phase, after the real domain is connected and e-Namad is obtained; a future `payments` table will reference `orders.id`. Every product keeps its price and stock fields for that future cart.

## Placeholder Content
Until the first collection is photographed/filmed, temporary images with a commercial license (Unsplash/Pexels) or photos sent by the owner are used. These will later be replaced by the owner through the custom admin panel — with no code changes needed.
