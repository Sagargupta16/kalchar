# CLAUDE.md

> This file stacks on top of the workspace root at `C:\Code\GitHub\`:
> - Root [`CLAUDE.md`](../../CLAUDE.md) -- voice, rules, routing map, references, skills, slash commands, conventions.
> - Root [`MEMORY.md`](../../MEMORY.md) -- live facts across repos.
> - Root [`STATUS.md`](../../STATUS.md) -- live PR/CI/security dashboard.
> - [`.claude/resources/`](../../.claude/resources/README.md) -- deep reference for collaboration, workflow, git, OSS, debugging, voice.
>
> Read those first. The guidance below only adds **repo-specific context** -- it does not override anything in the root.

## Project

Portfolio website for **Megha Seth**, traditional artist. Owned, self-hosted, eventually under her own domain.

Aesthetic: warm light / dark / editorial / classical -- artwork-forward, italic display serif, generous whitespace, single warm accent sampled from the work.

## Stack

Migrated 2026-05-22. Frontend-only, static deploy.

- **Vite 6 + React 19 + TypeScript 6** -- single-page React app. All components are TSX. TS strict mode via `tsconfig.json`.
- **Tailwind 4** via `@tailwindcss/vite`. Theme tokens defined with `@theme` in [`src/styles/globals.css`](src/styles/globals.css). Light/dark via `class="dark"` on `<html>`.
- **Self-hosted fonts** -- Cormorant Garamond (display serif, italic-forward), Inter (body), Tiro Devanagari Hindi (accent). All via `@fontsource(-variable)`. No Google Fonts CDN call.
- **JSON-driven content** -- single source of truth in [`src/data/site.json`](src/data/site.json) (brand, nav, sections, workshops) and [`src/data/artworks.json`](src/data/artworks.json) (artwork catalog). Imported directly via `resolveJsonModule`. Same model survives a future CMS or backend swap.
- **Image pipeline** -- build-time `sharp` script at [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs) generates AVIF + WebP variants (400/800/1200 widths) into `public/_opt/artworks/` (gitignored). [`src/components/ui/ArtworkImage.tsx`](src/components/ui/ArtworkImage.tsx) emits `<picture>` with multi-format `<source srcset>` chains; the original `.jpg` in `public/artworks/` stays as a fallback.
- **SEO** -- A custom Vite plugin in [`vite.config.ts`](vite.config.ts) injects description / Open Graph / Twitter / canonical / JSON-LD into [`index.html`](index.html) at build time and writes `dist/sitemap.xml` from [`src/data/artworks.json`](src/data/artworks.json). URLs (canonical, OG, sitemap, JSON-LD `@id`s) all derive from a single source of truth at [`scripts/site-config.mjs`](scripts/site-config.mjs). `robots.txt` lives in `public/`.

Backend hooks left as inert seams (contact form, workshop booking) -- to be activated when needed without restructuring.

## Memory

Read [`MEMORY.md`](MEMORY.md) at session start, alongside the workspace-root files in the stacking preamble. It holds repo-specific facts: client role, locked decisions, pending decisions (linked to the new-artwork skill), and the content inventory.

Update `MEMORY.md` when:

- A locked decision changes (e.g. domain registered, hosting migrated, stack swapped).
- A client-facing role or policy fact changes (rare).

The catalog [`src/data/artworks.json`](src/data/artworks.json) is the source of truth for artwork count, titles, slugs, and styles -- never duplicate that into MEMORY.md.

Never put PII in `MEMORY.md`. Contact details, payment terms, and anything sensitive stay out of the repo entirely.

## Run

```sh
pnpm install
pnpm dev          # local dev server (Vite)
pnpm build        # typecheck + static build to ./dist
pnpm preview      # serve the built site
pnpm typecheck    # tsc -b (TS strict)
```

Local URL: `http://localhost:5173/` (matches the apex production base).

## Test

Build + typecheck are the current quality gates. Playwright smoke test and Lighthouse CI to be added before public launch.

## Deploy

GitHub Pages from this repo (`Sagargupta16/folk-art-portfolio`), served at <https://kalchar.co.in/> via [`public/CNAME`](public/CNAME). The single source of truth for URLs is [`scripts/site-config.mjs`](scripts/site-config.mjs) -- `SITE` and `BASE` flow from there into `vite.config.ts` (base path) and the SEO plugin (OG / canonical / JSON-LD) and into [`scripts/generate-sitemap.mjs`](scripts/generate-sitemap.mjs). To swap domains, change one file.

## Entry points

- [`index.html`](index.html) -- HTML shell with theme-detection script and `#root` mount point.
- [`src/main.tsx`](src/main.tsx) -- React entry point, renders `<App />` into `#root`.
- [`src/App.tsx`](src/App.tsx) -- composes layout + sections, runs the reveal IntersectionObserver.
- [`src/lib/site.ts`](src/lib/site.ts) -- typed re-exports from `src/data/site.json` (brand, nav, contact, styles, sections).

## Key files

- [`CLAUDE.md`](CLAUDE.md), [`MEMORY.md`](MEMORY.md), [`CHANGELOG.md`](CHANGELOG.md), [`README.md`](README.md) -- meta files at repo root.
- [`src/data/site.json`](src/data/site.json) -- brand, nav, contact, all section copy, workshops list.
- [`src/data/artworks.json`](src/data/artworks.json) -- artwork catalog (one entry per piece).
- [`src/components/layout/`](src/components/layout/) -- `Header`, `Footer`, `Section` wrapper (all TSX).
- [`src/components/sections/`](src/components/sections/) -- `Hero`, `About`, `Work`, `Workshops`, `CustomOrders`, `Contact`. One per page section.
- [`src/components/ui/`](src/components/ui/) -- `ThemeToggle`, `ArtworkImage` (`<picture>` wrapper), `ArtworkLightbox`, `Chromacard`, `Marquee`, `OrderForm`, `icons` (all TSX).
- [`src/lib/images.ts`](src/lib/images.ts) -- `Artwork` type + `artworkUrl(art, baseUrl)` helper.
- [`src/lib/site.ts`](src/lib/site.ts) -- typed re-exports of `src/data/site.json` (brand, nav, contact, styles, sections).
- [`src/lib/placeholder.ts`](src/lib/placeholder.ts) -- deterministic SVG placeholders per style.
- [`src/styles/globals.css`](src/styles/globals.css) -- Tailwind import, theme tokens, font imports, design-system utilities.
- [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs) -- build-time AVIF + WebP variant generator (sharp). Idempotent (mtime-aware), regenerates only changed sources.
- [`scripts/generate-sitemap.mjs`](scripts/generate-sitemap.mjs) -- build-time sitemap.xml generator (reads `artworks.json`, writes to `dist/`).
- [`public/artworks/`](public/artworks/) -- one `<slug>.jpg` per piece (committed; serves as the JPEG fallback in `<picture>` and as the canonical URL for `og:image` + JSON-LD).
- `public/_opt/artworks/` -- generated AVIF + WebP variants at 400/800/1200 widths. Gitignored, regenerated on every build.
- [`public/robots.txt`](public/robots.txt) -- allow-all, points at the sitemap.
- [`.claude/skills/new-artwork/SKILL.md`](.claude/skills/new-artwork/SKILL.md) -- recurring task: add a new artwork.

## Component conventions

- **All components are React TSX.** Functional components with hooks, no class components.
- **Path alias** `@/*` -> `src/*`. Always import via the alias, not relative climbs.
- **Theme tokens** referenced as `var(--color-*)` in Tailwind classes (`text-[var(--color-ink)]`). Do not hardcode hex.
- **One section per file** under `src/components/sections/`. `App.tsx` composes them in order.

## Gotchas

- Client (Megha) does not write code. Update flow is Sagar edits and ships -- no CMS yet. If she ever wants self-edit, the JSON-driven catalog is CMS-ready (Decap, Sanity, etc.) without restructuring.
- Domain: `kalchar.co.in` (apex), client-owned, landed 2026-05-24. Served from the repo root via [`public/CNAME`](public/CNAME). DNS at the registrar: 4 A records to GitHub Pages IPs (185.199.108.153, .109.153, .110.153, .111.153) plus `www` CNAME -> `sagargupta16.github.io`. To swap domains, edit only [`scripts/site-config.mjs`](scripts/site-config.mjs) -- everything else (canonical, OG URLs, sitemap, JSON-LD) derives from there.
- Adding a new artwork: drop `<slug>.jpg` into [`public/artworks/`](public/artworks/), append an entry to [`src/data/artworks.json`](src/data/artworks.json) with matching `image: "<slug>.jpg"`. The build runs [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs) automatically and the gallery + hero pick it up via [`ArtworkImage.tsx`](src/components/ui/ArtworkImage.tsx).

## Branching and releases

Two long-lived branches, one deploy target:

| Branch | URL | Role |
| --- | --- | --- |
| `main` | `https://kalchar.co.in/` | Production. Protected: PR-only, CI must pass. |
| `dev` | local-only (`pnpm preview`) | Integration. GH Pages allows one custom domain per repo, so no public staging URL. |

Promotion flow: `feat/<topic>` -> PR into `dev` -> verify locally with `pnpm preview` -> PR `dev` into `main` -> deploys to prod.

- **No direct push to `main` or `dev`.** Work on a feature branch (`feat/<topic>`, `fix/<topic>`, `chore/<topic>`). Don't push to remote until Sagar explicitly says so ("push it", "push and PR", etc.). Server-side branch protection is configured on `main`; `dev` relies on convention.
- **PRs only into `main`.** All prod changes land via the `dev` -> `main` promotion PR. No fast-forward from local, no direct push.
- **One open PR at a time per target.** Don't open a second PR into `dev` while one is unmerged; stack onto the existing branch. The `dev` -> `main` promotion PR is its own slot and may coexist with an open feature -> `dev` PR. Exception: a true hotfix on a separate branch, linked in the existing PR body.
- **Single deploy target.** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys only on push to `main`. `dev` is verified locally before promotion -- no public staging URL.
- **Versioning: SemVer, manual, pre-1.0.0** while the site is in build-out. 1.0.0 = first public launch on the client's domain.
  - **Patch** (`0.x.Y`): typo, broken link, image swap, CSS tweak, new artwork added.
  - **Minor** (`0.X.0`): new gallery section / page, content model change, stack swap.
  - **Major** (`X.0.0`): reserved -- only after 1.0.0 ships.
- **Always version. No `[Unreleased]`.** Every PR opens with a chosen version number in [`CHANGELOG.md`](CHANGELOG.md). On merge to `main`, that version becomes a release -- tag the merge commit (`git tag v1.1.0`) and push the tag. No floating drafts; the changelog always reflects what's in `main`.

## Tech posture

- **Latest stable everything.** Greenfield client work, no legacy users -- use the newest stable versions of languages, runtimes, frameworks, and libraries. No "safe but old" pins unless there's a documented constraint (browser support, hosting limit, etc.).
- **Modern syntax and APIs.** Latest ECMAScript / Python / whichever lands in the stack. No deprecated APIs. Prefer the newest idiomatic patterns over older ones, even when both work.

## Repo-specific rules

- This is **client work**, not a personal project. Voice in copy = the artist's voice, not Sagar's. Don't apply Sagar's voice principles to anything user-facing.
- Image rights are cleared (confirmed 2026-05-17). Hosting and using artwork imagery in this repo is fine.
- **500-line file ceiling.** No source file (`.astro`, `.tsx`, `.ts`, `.css`, `.json`) may exceed 500 lines. If you hit the limit, split before committing -- extract a sub-component, lift styles to `globals.css`, or pull data into JSON. Generated/lockfiles (`pnpm-lock.yaml`, `dist/**`) are exempt. Bumping the ceiling is a real decision; don't.
