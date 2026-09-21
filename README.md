# deVino

Website for **deVino** — a premium women's evening-wear brand. See
`CLAUDE.md` for the brand and technical decisions this project follows, and
`phase-2-skeleton-brief.md` / `phase-3-header-brief.md` /
`phase-4-collections-product-brief.md` / `sanity-to-d1-migration-brief.md`
for the briefs the project has implemented so far.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS v4** — design tokens (colors, fonts) in `tailwind.config.ts`
- **next-intl** — bilingual routing, `fa` (default) and `en`, with per-locale
  `dir` (`rtl`/`ltr`)
- **Cloudflare D1 + R2** — content database and media storage, managed
  through a dedicated `/admin` panel (see "Admin panel" below). Not Sanity —
  see `CLAUDE.md` / `sanity-to-d1-migration-brief.md` for why.
- Deploys to **Cloudflare Workers** via the OpenNext adapter
  (`@opennextjs/cloudflare`) — Preview only, see `CLAUDE.md` on the
  production domain

## Getting started

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in ADMIN_PASSWORD / SESSION_SECRET
npm run db:migrate:local          # create + migrate the local D1 database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the
default locale (`/fa`). English lives under `/en`. `/admin` (not localized)
is the content management panel.

`next dev` runs against **local** D1/R2 emulation (via
`initOpenNextCloudflareForDev()` in `next.config.ts`, reading the bindings
declared in `wrangler.jsonc`) — no Cloudflare account or network access is
needed for local development; everything is emulated on disk under
`.wrangler/state/`.

## Cloudflare D1 + R2 setup (real deployment)

`wrangler.jsonc` declares the `DB` (D1) and `MEDIA` (R2) bindings with
placeholder values — local dev doesn't care, but a real deployment needs
the real resources provisioned once, from somewhere with normal Cloudflare
API access:

```bash
npx wrangler login                              # first time only
npx wrangler d1 create devino-db                # copy the printed database_id
npx wrangler r2 bucket create devino-media
npm run db:migrate:remote                       # applies migrations/ to the real DB
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET          # e.g. `openssl rand -hex 32`
```

Then paste the real `database_id` into `wrangler.jsonc`'s `d1_databases`
entry (replacing `00000000-0000-0000-0000-000000000000`) before deploying.

## Project structure

```
src/app/(site)/[locale]/   Public site routes (localized: /fa/*, /en/*)
src/app/admin/             Admin panel — NOT localized, excluded from
                           next-intl middleware (see src/lib/adminAuth.ts)
src/app/media/[id]/        Streams an R2 object by media.id (see src/db/media.ts)
src/components/            Header, Footer, NewsletterForm, MediaBox,
                           CollectionCard, ProductCard, ProductGallery,
                           ContactChannels
src/components/admin/      FocalPointPicker (click-on-image focal point tool)
src/db/                    D1 query layer: queries.ts (public reads),
                           admin.ts (admin CRUD writes), media.ts, client.ts
src/lib/adminAuth.ts       Session-cookie auth check for /admin
src/lib/adminSession.ts    HMAC session token sign/verify, password compare
src/i18n/                  next-intl routing/navigation config
src/lib/fonts.ts           next/font setup (Cormorant Garamond, Inter)
src/lib/formatPrice.ts     Locale-aware Toman price formatting
migrations/                D1 schema migrations (wrangler d1 migrations)
messages/{fa,en}.json      UI copy per locale
wrangler.jsonc             Worker config: D1/R2 bindings, assets
```

## MediaBox

`src/components/MediaBox.tsx` is the single component every image/video
surface on the site renders through (see `CLAUDE.md`). It takes normalized
`{ type, asset, focalPoint, alt, zoom }` props and stays intentionally dumb
about where the data comes from; `src/db/media.ts`'s `resolveMedia()` maps
a `media` table row into those props, with every asset served through
`GET /media/[id]` (see `src/app/media/[id]/route.ts`) rather than a direct
R2/public URL. Images get a continuous, back-and-forth Ken Burns zoom
around their focal point by default (CSS-only, `prefers-reduced-motion`-aware,
paused while off-screen); pass `zoom={false}` to opt out for static surfaces
like the collection/product grids. Videos autoplay muted/looped with no
zoom regardless — both behaviors live only here, so swapping an image for
a video (via the admin panel) needs no code change.

## Collections and product pages

`src/db/queries.ts` holds every D1 read the public site does
(`getCollections`, `getCollectionBySlug`, `getProductBySlug`,
`getSiteSettings`), each wrapped so a not-yet-provisioned database degrades
to an empty result instead of breaking the page — `/collections`,
`/collections/[slug]`, and `/products/[slug]` all render an explicit empty
or not-found state rather than fabricated content, and are all
`force-dynamic` (D1 content can change via `/admin` at any time, so nothing
here is statically cached). The presentational pieces (`CollectionCard`,
`ProductCard`, `ProductGallery`, `ContactChannels`) take already-resolved
props, not raw database rows, so they can be reviewed with mock data
independently of live content. The product page's "to place an order"
section reads phone/Telegram/Instagram from `site_settings` — never
hardcoded — and is deliberately quiet (no cart, no buy button; see
`CLAUDE.md` on the first version's scope).

## Admin panel

`/admin` (not part of the `/fa`/`/en` routing — see `middleware.ts`'s
matcher) is a single-password-protected panel for managing collections,
products, and site settings without touching code:

- **Auth**: one shared `ADMIN_PASSWORD` (compared with a constant-time
  check), a signed session cookie (HMAC-SHA256 over an expiry timestamp,
  `SESSION_SECRET`) — no user accounts, no session table. See
  `src/lib/adminSession.ts` / `src/lib/adminAuth.ts` /
  `src/app/admin/actions.ts`.
- **Focal point picker** (`src/components/admin/FocalPointPicker.tsx`):
  click on the image preview to set a fractional (0–1) x/y focal point,
  submitted alongside the file upload in the same form — replaces Sanity
  Studio's hotspot tool.
- **Media**: uploads go straight to the `MEDIA` R2 bucket
  (`src/db/admin.ts`'s `uploadMedia()`), with a `media` row recording the
  R2 key, content type, focal point, and bilingual alt text.
- Deliberately **not** on the site's brand palette or fonts (plain Tailwind
  gray scale) — it's an internal tool, not brand-facing surface.

Once a real D1/R2 setup exists (see above), log in at `/admin/login` and
add real collections/products — there's no separate seed script; the
admin panel *is* the content-entry tool (see
`sanity-to-d1-migration-brief.md`, item 5).

## Logo

`src/components/Logo.tsx` renders the real wordmark files in
`public/logos/` (`devino-logo-black.png` / `devino-logo-white.png` —
cropped from the originals, which had a lot of transparent padding/shadow
around the actual glyphs, and downscaled for web use). `variant="auto"`
(used in the header) stacks both images and crossfades their opacity as
`HeroScrollController` toggles `.is-light` on the header; `variant="black"`
(used in the footer, which is always on the light end of the palette) just
pins one file — see `globals.css` for the crossfade rules.

## Current phase (Sanity → Cloudflare D1 migration, done)

The homepage hero, scroll-linked header tween, logo crossfade, and the
`/collections` / `/collections/[slug]` / `/products/[slug]` pages built in
phase 4 are all unchanged in behavior — only the data source moved. Sanity
(schemas, standalone Studio, the GROQ query layer) has been fully removed;
content now lives in Cloudflare D1 with media in R2, managed through the
new `/admin` panel described above. `about`/`contact` remain phase-2
placeholder copy on purpose (out of scope for this migration).

## Scripts

```bash
npm run dev              # start dev server (against local D1/R2 emulation)
npm run build             # production build (plain Next.js)
npm run lint               # ESLint
npm run format             # Prettier (writes)
npm run format:check       # Prettier (check only)
npm run preview            # build for Cloudflare + run it locally via Wrangler
npm run deploy              # build for Cloudflare + deploy to Workers
npm run cf-typegen         # regenerate cloudflare-env.d.ts from wrangler.jsonc
npm run db:migrate:local   # apply migrations/ to the local D1 emulation
npm run db:migrate:remote  # apply migrations/ to the real D1 database
```

## Deployment (Cloudflare Workers)

The app deploys to Cloudflare Workers through
[OpenNext's Cloudflare adapter](https://opennext.js.org/cloudflare), which
converts the Next.js build into a Worker. Config lives in
`open-next.config.ts` (adapter options) and `wrangler.jsonc` (Worker name,
assets, D1/R2 bindings).

```bash
npx wrangler login   # first time only
npm run deploy
```

This prints a `*.workers.dev` preview URL. Per `CLAUDE.md`, the
`devinomaison.ir` production domain must **not** be connected to any
deployment until explicitly instructed by the project owner — all review
happens on the `*.workers.dev` URL, never a custom domain.

To try a production build locally before deploying, use `npm run preview`
instead (runs the Worker under Wrangler on `localhost`).

**Note on this repo's own history**: several deploy/provisioning steps
(`wrangler d1 create`, `wrangler r2 bucket create`, `wrangler deploy`,
`wrangler secret put`) all need real Cloudflare API access. A sandboxed
Claude Code session's network is allowlisted to a handful of hosts (npm,
PyPI, Anthropic's own APIs) and `api.cloudflare.com` isn't on that list —
these commands fail there with a proxy-level connection rejection before
ever reaching Cloudflare, the same way `api.sanity.io` did. Run them from a
machine with normal internet access, or trigger them via the Cloudflare
dashboard's Workers Builds git integration (below), which builds and
deploys on Cloudflare's own infrastructure regardless of where the `git
push` came from.

### Deploying via Cloudflare Workers Builds (git integration)

If the Cloudflare dashboard project is connected to this GitHub repo
("Workers Builds"), its auto-detected **Deploy command** runs
`opennextjs-cloudflare deploy` on its own — it does **not** also run
`opennextjs-cloudflare build` first, so the deploy step fails with
`ERROR Could not find compiled Open Next config, did you run the build
command?` (the `.open-next/` bundle was never produced). This is a
dashboard setting, not something fixable from the repo. Fix it once in the
Cloudflare dashboard:

1. **Workers & Pages** → select this Worker → **Settings** → **Builds**.
2. Set **Build command** to `npx opennextjs-cloudflare build` (or set
   **Deploy command** to `npm run deploy`, which already runs build then
   deploy — either works, pick one).
3. Confirm **Root directory** is the repo root (this isn't a monorepo).
4. Retry the deployment (or push again).

The `ADMIN_PASSWORD`/`SESSION_SECRET` secrets (see "Cloudflare D1 + R2
setup" above) and the real D1 `database_id` in `wrangler.jsonc` still need
to be set independently of this git integration — Workers Builds only
handles the build+deploy step, not resource provisioning or secrets.

### Cloudflare-specific notes

- **Images**: Next's built-in image optimizer needs `sharp`, which isn't
  available on the Workers runtime, so `next.config.ts` sets
  `images.unoptimized = true`. Media served from R2 (via `/media/[id]`) and
  the Unsplash/Pexels placeholders are served as-is; revisit if a
  Cloudflare Images binding is added later.
- **Local dev with bindings**: `next.config.ts` calls
  `initOpenNextCloudflareForDev()` so `next dev` gets local D1/R2 emulation
  and reads secrets from `.dev.vars`, matching the Workers runtime.
- **Caching**: no incremental cache override is configured yet since the
  D1-backed pages are all `force-dynamic` (no ISR to cache). Add the R2
  incremental cache in `open-next.config.ts` if that changes later — see
  https://opennext.js.org/cloudflare/caching.
