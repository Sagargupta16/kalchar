# MEMORY.md

Repo-specific facts that need to persist across Claude sessions. Stacks on the workspace root [MEMORY.md](../../MEMORY.md) -- this file adds details about *this* project. Read at session start.

Never put PII here. Contact details, payment terms, etc. stay out of the repo.

## Roles

- **Megha Seth** -- the artist. Owns all artwork rights. Does not write code. All copy is hers; voice in user-facing text is hers, not Sagar's.
- **Sagar Gupta** -- developer. Edits and ships. Sole maintainer.
- **Image rights** confirmed 2026-05-17 -- hosting and reproducing artwork in this repo is approved.

## Locked decisions

| Decision | Value | Notes |
| --- | --- | --- |
| Domain | `kalchar.co.in` | Apex, client-owned. Landed 2026-05-24. DNS: 4 A-records to GH Pages IPs + `www` CNAME -> `sagargupta16.github.io`. To swap, edit only [scripts/site-config.mjs](scripts/site-config.mjs). |
| Hosting | GitHub Pages | OIDC deploy from `main`. `public/CNAME` ships the apex. |
| Deploy environments | Single (prod only) | `dev` is local-only via `pnpm preview`. GH Pages allows one custom domain per repo. |
| Stack | Vite 6 + React 19 + TS 6 strict + Tailwind 4 + Biome 2 | Self-hosted fonts. No CDN font calls, no analytics, no tracking. |
| Package manager | pnpm 10 | Pinned via `packageManager` field. |
| Default branch | `main` | Protected, PR-only, CI must pass. |
| Branching | `feat/<topic>` -> `dev` (local) -> `main` (prod) | One open PR per target at a time. |
| Versioning | Manual SemVer, pre-1.0.0 | 1.0.0 = first public launch on client's domain. |
| Image pipeline | Build-time `sharp` -> AVIF q82 + WebP q90 at 400/800/1200 widths | Idempotent (mtime-aware). `public/_opt/` gitignored. |
| Content model | Two JSON files | `src/data/site.json` + `src/data/artworks.json`. CMS-ready without restructuring. |
| Line endings | LF enforced via `.gitattributes` | So Biome (lineEnding: lf) and Windows working trees agree. |

## v3 rebuild (2026-05-24)

The frontend (`src/components/**`, `src/styles/**`, `src/hooks/**`, `src/lib/*` except `data/`, `App.tsx`, `main.tsx`) was wiped on branch `feat/ui-theme-foundation`. Earlier iterations accumulated inconsistency: card sizes varied wildly, glass was applied to too many surfaces, motion felt busy.

What survived the wipe:
- `src/data/site.json`, `src/data/artworks.json` -- the catalog
- `public/` -- artwork images, logo, CNAME, robots.txt
- `scripts/` -- image optimizer, sitemap generator, site-config
- `.github/workflows/` -- CI + deploy
- `index.html`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json`, `pnpm-lock.yaml`, `.gitattributes`, `.gitignore`, `.env.example`, `LICENSE`, `renovate.json`, `CHANGELOG.md`

What's locked from the brainstorming round (still good):
- **Mood**: glassy + artisan, editorial-classical
- **Palette**: warm cream/ink base + 3 lead pigments (terracotta, peacock, marigold). Tier 1 primitives -> Tier 2 semantic -> Tier 3 contextual, all in `globals.css`.
- **Typography**: Cormorant Garamond italic display + Inter body + Tiro Devanagari Hindi accent
- **Dark mode**: full toggle, persisted, `class="dark"` on `<html>`, no-FOUC inline script in `index.html`

What's open for v3 (decide before building):
- Card size rule (uniform vs. masonry by aspectRatio)
- Motion intensity (recalibrate after the "lush" round felt busy)
- Glass scope (chrome only vs. chrome + featured surfaces vs. everywhere)

## Gotchas

- **vite.config.ts SEO plugin** reads `src/data/artworks.json` + `src/data/site.json` at build time. The plugin and `scripts/generate-sitemap.mjs` both depend on these files existing -- they are the only `src/` files needed for `pnpm build` to succeed.
- **The site is a client SPA.** Crawlers see only what static `index.html` carries. The SEO plugin injects JSON-LD + a hero preload at a `<!--seo-injection-marker-->` comment so crawlers get a rich document.
- **No backend.** Contact form, workshop booking are inert seams -- to be activated later without restructuring.
