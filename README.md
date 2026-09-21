# deVino

Website for **deVino** — a premium women's evening-wear brand. See
`CLAUDE.md` for the brand and technical decisions this project follows, and
`phase-2-skeleton-brief.md` / `phase-3-header-brief.md` for the briefs the
project has implemented so far.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS v4** — design tokens (colors, fonts) in `tailwind.config.ts`
- **next-intl** — bilingual routing, `fa` (default) and `en`, with per-locale
  `dir` (`rtl`/`ltr`)
- **Sanity** — CMS, standalone Studio (see "Sanity Studio" below)
- Deploys to **Cloudflare Workers** via the OpenNext adapter
  (`@opennextjs/cloudflare`) — Preview only, see `CLAUDE.md` on the
  production domain

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the
default locale (`/fa`). English lives under `/en`.

### Connecting Sanity

1. Create a project at [sanity.io/manage](https://www.sanity.io/manage) (or
   run `npx sanity@latest init` and choose "use existing project" during
   the first-time CLI login).
2. Fill in `.env.local`:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=<your-project-id>
   NEXT_PUBLIC_SANITY_DATASET=production
   ```
3. Run `npm run studio:dev` to manage content locally. Until real
   credentials are set, the public site still builds and runs fine — it
   doesn't fetch Sanity data yet (see "Current phase" below).

## Sanity Studio

Studio runs **standalone** via the Sanity CLI, not embedded in the Next.js
app:

```bash
npm run studio:dev      # local Studio, defaults to localhost:3333
npm run studio:deploy   # hosted Studio at <project-name>.sanity.studio
```

This is a deliberate change from the original plan to embed Studio at
`/studio` inside the Next app: on Cloudflare Workers, that route 500'd with
`ReferenceError: MessagePort is not defined` — the Sanity Studio bundle
depends on a global the `workerd` runtime doesn't implement, and there's no
compatibility flag for it. The public site is unaffected; this only ever
broke the admin UI. `sanity.config.ts` and the schema types are unchanged
and work the same way for both `sanity dev` and a future embedded attempt,
if that gap in `workerd` closes later.

## Project structure

```
src/app/(site)/[locale]/   Public site routes (localized: /fa/*, /en/*)
src/components/            Header, Footer, NewsletterForm, MediaBox,
                           CollectionCard, ProductCard, ProductGallery,
                           ContactChannels
src/i18n/                  next-intl routing/navigation config
src/lib/fonts.ts           next/font setup (Cormorant Garamond, Inter)
src/lib/formatPrice.ts     Locale-aware Toman price formatting
src/sanity/                Sanity client, image builder, schema types,
                           lib/queries.ts (GROQ query layer)
scripts/seed.mjs           One-time demo content seed (see below)
messages/{fa,en}.json      UI copy per locale
sanity.config.ts           Studio config (standalone — see "Sanity Studio")
```

## MediaBox

`src/components/MediaBox.tsx` is the single component every image/video
surface on the site renders through (see `CLAUDE.md`). It takes normalized
`{ type, asset, focalPoint, alt, zoom }` props and stays intentionally dumb
about Sanity; `src/sanity/lib/mediaBox.ts` maps a raw Sanity `mediaBox`
field value into those props. Images get a continuous, back-and-forth Ken
Burns zoom around their focal point by default (CSS-only,
`prefers-reduced-motion`-aware, paused while off-screen); pass `zoom={false}`
to opt out for static surfaces like the phase 4 collection/product grids,
where the brief calls for no zoom. Videos autoplay muted/looped with no
zoom regardless — both behaviors live only here, so swapping an image for
a video at a call site needs no code change.

## Collections and product pages (phase 4)

`src/sanity/lib/queries.ts` holds every GROQ read the public site does
(`getCollections`, `getCollectionBySlug`, `getProductBySlug`,
`getSiteSettings`), each wrapped so a missing/misconfigured Sanity project
degrades to an empty result instead of breaking the page — `/collections`,
`/collections/[slug]`, and `/products/[slug]` all render an explicit empty
or not-found state rather than fabricated content. The presentational
pieces (`CollectionCard`, `ProductCard`, `ProductGallery`,
`ContactChannels`) take already-resolved props, not raw Sanity shapes, so
they can be reviewed with mock data independently of live content. The
product page's "to place an order" section reads phone/Telegram/Instagram
from `siteSettings` in Sanity — never hardcoded — and is deliberately quiet
(no cart, no buy button; see `CLAUDE.md` on the first version's scope).

Once a real Sanity project is connected, run `npm run seed` (see
`scripts/seed.mjs`) to populate a few demo collections/products from the
photos already in `public/photos/` — it uploads images and creates draft
documents for review in Studio, it never publishes on its own.

## Logo

`src/components/Logo.tsx` renders the real wordmark files in
`public/logos/` (`devino-logo-black.png` / `devino-logo-white.png` —
cropped from the originals, which had a lot of transparent padding/shadow
around the actual glyphs, and downscaled for web use). `variant="auto"`
(used in the header) stacks both images and crossfades their opacity as
`HeroScrollController` toggles `.is-light` on the header; `variant="black"`
(used in the footer, which is always on the light end of the palette) just
pins one file — see `globals.css` for the crossfade rules.

## Current phase (4 — collections & product pages, done)

The homepage hero, scroll-linked header tween, and logo crossfade from
phase 3 are unchanged. Phase 4 adds the real `/collections`,
`/collections/[slug]`, and `/products/[slug]` pages (see "Collections and
product pages (phase 4)" above) — all backed by the GROQ query layer, with
graceful empty states since no real Sanity project is connected yet
(`projectId` still defaults to `"placeholder"`, see
`phase-4-collections-product-brief.md`). Eight of the nine remaining
placeholder photos in `public/photos/` are now referenced by `scripts/seed.mjs`
for demo content; `about`/`contact` remain phase-2 placeholder copy on
purpose (out of scope for this phase). Sanity schemas (`product`,
`collection`, `mediaBox`, `siteSettings`) are defined and Studio runs
standalone (see "Sanity Studio" above).

## Scripts

```bash
npm run dev            # start dev server
npm run build           # production build (plain Next.js)
npm run lint             # ESLint
npm run format           # Prettier (writes)
npm run format:check     # Prettier (check only)
npm run preview          # build for Cloudflare + run it locally via Wrangler
npm run deploy           # build for Cloudflare + deploy to Workers
npm run cf-typegen       # regenerate cloudflare-env.d.ts from wrangler.jsonc
npm run seed             # seed demo collections/products into a real Sanity project
```

## Deployment (Cloudflare Workers)

The app deploys to Cloudflare Workers through
[OpenNext's Cloudflare adapter](https://opennext.js.org/cloudflare), which
converts the Next.js build into a Worker. Config lives in
`open-next.config.ts` (adapter options) and `wrangler.jsonc` (Worker name,
assets, bindings).

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

If Sanity env vars are ever required at build time (not the case yet — see
"Current phase"), also add them under **Build variables and secrets** in
the same Settings page, since Workers Builds runs in a clean environment
that doesn't see your local `.env.local`.

### Cloudflare-specific notes

- **Images**: Next's built-in image optimizer needs `sharp`, which isn't
  available on the Workers runtime, so `next.config.ts` sets
  `images.unoptimized = true`. This doesn't lose real optimization here —
  Sanity's `urlForImage()` already returns resized, auto-format CDN URLs,
  and the Unsplash/Pexels placeholders accept their own sizing params.
- **Local dev with bindings**: `next.config.ts` calls
  `initOpenNextCloudflareForDev()` so `next dev` behaves like the Workers
  runtime. No bindings (KV/R2/etc.) are used yet.
- **Caching**: no incremental cache override is configured yet since no
  page fetches Sanity data or uses ISR in this phase. Add the R2
  incremental cache in `open-next.config.ts` when that's needed — see
  https://opennext.js.org/cloudflare/caching.
