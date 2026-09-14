# deVino

Website skeleton for **deVino** — a premium women's evening-wear brand. See
`CLAUDE.md` for the brand and technical decisions this project follows, and
`phase-2-skeleton-brief.md` for the brief this phase implements.

## Stack

- **Next.js (App Router)** + TypeScript
- **Tailwind CSS v4** — design tokens (colors, fonts) in `tailwind.config.ts`
- **next-intl** — bilingual routing, `fa` (default) and `en`, with per-locale
  `dir` (`rtl`/`ltr`)
- **Sanity** — CMS, embedded Studio at `/studio`
- Deploys to **Vercel** (Preview only — see `CLAUDE.md` on the production
  domain)

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
3. Visit `/studio` to manage content. Until real credentials are set, the
   public site still builds and runs fine — it doesn't fetch Sanity data
   yet (see "Current phase" below).

## Project structure

```
src/app/(site)/[locale]/   Public site routes (localized: /fa/*, /en/*)
src/app/studio/            Embedded Sanity Studio (not localized)
src/components/            Header, Footer, NewsletterForm, MediaBox
src/i18n/                  next-intl routing/navigation config
src/lib/fonts.ts           next/font setup (Cormorant Garamond, Inter)
src/sanity/                Sanity client, image builder, schema types
messages/{fa,en}.json      UI copy per locale
```

`(site)` and `studio` are separate Next.js route groups, each with its own
root layout — this lets the public site set `<html lang dir>` per locale
without affecting the Studio shell.

## MediaBox

`src/components/MediaBox.tsx` is the single component every image/video
surface on the site renders through (see `CLAUDE.md`). It takes normalized
`{ type, asset, focalPoint, alt }` props and stays intentionally dumb about
Sanity; `src/sanity/lib/mediaBox.ts` maps a raw Sanity `mediaBox` field
value into those props. This phase only renders responsive, focal-point-
aware images/video — the Ken Burns zoom and video autoplay behavior land in
phase 3 inside this same component, with no changes needed at any call
site.

## Current phase (2 — skeleton)

Every route renders a heading and placeholder copy only — no real content
fetching, no final visual design, no header zoom/scroll-color effects (see
`phase-2-skeleton-brief.md` for what's explicitly out of scope). Sanity
schemas (`product`, `collection`, `mediaBox`, `siteSettings`) are defined
and Studio is wired up, ready for content modeling in later phases.

## Scripts

```bash
npm run dev           # start dev server
npm run build          # production build
npm run lint            # ESLint
npm run format          # Prettier (writes)
npm run format:check    # Prettier (check only)
```

## Deployment

Push to a branch and open a PR — Vercel builds a Preview deployment
automatically. Per `CLAUDE.md`, the `devinomaison.ir` production domain
must **not** be connected to any deployment until explicitly instructed by
the project owner; all review happens on Vercel's own `*.vercel.app`
preview URLs.
