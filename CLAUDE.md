# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Stacks on the workspace root at `C:\Code\GitHub\`:
> - Root [`CLAUDE.md`](../../CLAUDE.md) -- voice, rules, routing, references, skills, conventions.
> - Root [`MEMORY.md`](../../MEMORY.md), [`STATUS.md`](../../STATUS.md) -- live cross-repo facts.
>
> Read those first. The guidance below adds **repo-specific context** only.

## Project

Portfolio website for **Megha Seth**, traditional folk artist (Madhubani, Pichwai, Lippan, Gond, texture art). Live at <https://kalchar.co.in/>. Static, JSON-driven, light-and-dark single-page React app. Client work, not a personal project -- voice in copy is the artist's, not Sagar's.

## Commands

```sh
pnpm install
pnpm dev          # vite dev server -- http://localhost:5173/
pnpm build        # optimize:images -> tsc -b -> vite build -> generate:sitemap -> dist/
pnpm preview      # serve the production build
pnpm typecheck    # tsc -b (TS strict, noEmit)
pnpm lint         # biome check
pnpm lint:fix     # biome check --write
pnpm format       # biome format --write
pnpm optimize:images   # regenerate AVIF/WebP variants from public/artworks/
pnpm generate:sitemap  # emit dist/sitemap.xml
```

Requires Node 20.18+ (`engines.node`) and pnpm 10 (pinned via `packageManager`, picked up by Corepack). CI uses Node 22.

There is no test runner yet -- typecheck + build + Biome are the quality gates.

## Architecture

### Content model -- two JSON files are the entire CMS

- [`src/data/site.json`](src/data/site.json) -- brand, nav, contact, every section's copy, the workshops list.
- [`src/data/artworks.json`](src/data/artworks.json) -- the artwork catalog. One entry per piece: `slug`, `title`, `style`, `medium`, `aspectRatio`, `featured`, `order`, `description`, `image`, optional `palette`.

Both are imported via `resolveJsonModule`. Types in [`src/lib/images.ts`](src/lib/images.ts) (`Artwork`) and [`src/lib/site.ts`](src/lib/site.ts) (typed re-exports of `site.json`) document the shape -- bad shapes surface as compile errors via `pnpm typecheck`. Sorting by `order` happens once at the boundary in `src/lib/site.ts`; consumers receive a `readonly Artwork[]` already sorted.

### URLs flow from one file

[`scripts/site-config.mjs`](scripts/site-config.mjs) exports `SITE` (`https://kalchar.co.in`) and `BASE` (`/`). Imported by:
- [`vite.config.ts`](vite.config.ts) -- sets the build's base path.
- [`vite.config.ts`](vite.config.ts) `seoPlugin` -- builds canonical / OG / JSON-LD URLs.
- [`scripts/generate-sitemap.mjs`](scripts/generate-sitemap.mjs) -- emits `dist/sitemap.xml`.

Swapping domains = edit one file. Don't hardcode `kalchar.co.in` anywhere else.

### Build-time SEO injection

[`vite.config.ts`](vite.config.ts) defines `seoPlugin` (a `transformIndexHtml` plugin, `order: "pre"`). At build time it:
1. Reads `artworks.json` and `site.json`.
2. Constructs a JSON-LD graph: one `Person`/`VisualArtist` node, one `WebSite` node, one `VisualArtwork` per catalog entry.
3. Picks the `featured` artwork (lowest `order`) and emits a `<link rel="preload" as="image" type="image/webp" imagesrcset=...>` so the LCP candidate is fetched before the JS bundle parses.
4. Replaces the `<!--seo-injection-marker-->` comment in [`index.html`](index.html) with both blocks.

The static `<meta>` description / OG / Twitter / canonical tags in `index.html` exist as a fallback so opening the file without a build still shows something reasonable -- the build-time plugin overwrites the dynamic ones.

### Image pipeline

- Source of truth: `public/artworks/<slug>.jpg` (committed; also serves as `<img>` fallback inside `<picture>` and as the canonical URL for `og:image` and JSON-LD `image` fields).
- [`scripts/optimize-images.mjs`](scripts/optimize-images.mjs) runs as part of `pnpm build` (and on demand via `pnpm optimize:images`). Uses `sharp` to generate AVIF (q82) + WebP (q90) at 400/800/1200 widths into `public/_opt/artworks/` (gitignored, regenerated on every build). **Idempotent**: skips outputs whose mtime is newer than the source.
- [`src/components/ui/ArtworkImage.tsx`](src/components/ui/ArtworkImage.tsx) emits `<picture>` with multi-format `<source srcset>` chains; the original JPEG is the final `<img>` fallback. Native `loading="lazy"` for the gallery; the hero passes `loading="eager"` + `fetchpriority="high"` and is preloaded via the SEO plugin.

### Adding a new artwork

1. Drop the file at `public/artworks/<slug>.jpg`.
2. Append an entry to [`src/data/artworks.json`](src/data/artworks.json) with `image: "<slug>.jpg"`.
3. `pnpm build` -- the optimizer picks it up; the gallery, hero candidate, JSON-LD, and sitemap all update.

The [`new-artwork`](.claude/skills/new-artwork/SKILL.md) skill automates this (currently deleted in working tree -- see git status).

### Theme & styling

- **Tailwind 4** via `@tailwindcss/vite`. Theme tokens declared with `@theme` in [`src/styles/globals.css`](src/styles/globals.css).
- **Light/dark** via `class="dark"` on `<html>`. The inline script in [`index.html`](index.html) reads `localStorage` + `prefers-color-scheme` before paint to avoid FOUC.
- **No hardcoded hex** in components. Reference tokens as `text-[var(--color-ink)]`, `bg-[var(--color-bg-soft)]`, etc. The token set covers warm light/dark + a saturated Madhubani palette + per-style accents (`--style-madhubani`, `--style-pichwai`, ...).
- **Motion lives in [`src/styles/motion.css`](src/styles/motion.css)** to keep `globals.css` under the line ceiling.

### Motion + reveal

- A site-wide `IntersectionObserver` in `App.tsx` adds `is-visible` to elements with class `.reveal`. CSS `nth-child` delays auto-stagger them.
- Lenis smooth-scroll is **dynamic-imported on first idle** -- keeps the ~10 KB out of the critical bundle. Failed dynamic import (network blip, ad blocker) silently falls back to native scroll.
- Decoratives (`CustomCursor`, `NoiseOverlay`, `ParticleField`, `Lattice3D`, `FloatingShapes`) are `React.lazy` with `Suspense fallback={null}` -- the page is fully usable without them.
- Every animation respects `prefers-reduced-motion` (checked via [`src/lib/media.ts`](src/lib/media.ts)). The reveal observer skips entirely and just marks everything visible. Tilt is suppressed on `(hover: none)`.

### Path alias

`@/*` -> `src/*`. Always import via the alias, not relative climbs. Configured in both `tsconfig.json` and `vite.config.ts`.

### Section composition

[`src/App.tsx`](src/App.tsx) renders, in order: `Header`, then under `<main>`: `Hero`, `Marquee`, `Work`, `About`, `Workshops`, `CustomOrders`, `Contact`, then `Footer`. One section per file under [`src/components/sections/`](src/components/sections/). UI primitives under [`src/components/ui/`](src/components/ui/). Layout chrome under [`src/components/layout/`](src/components/layout/).

## Branching and deploy

Two long-lived branches, one deploy target:

| Branch | URL | Role |
| --- | --- | --- |
| `main` | `https://kalchar.co.in/` | Production. Protected: PR-only, CI must pass. |
| `dev`  | local-only (`pnpm preview`) | Integration. GH Pages allows one custom domain per repo, so no public staging URL. |

Flow: `feat/<topic>` -> PR into `dev` -> verify locally -> PR `dev` into `main` -> deploys to prod.

- **No direct push to `main` or `dev`.** Work on `feat/<topic>` / `fix/<topic>` / `chore/<topic>`. Don't push to remote until Sagar says so.
- **One open PR at a time per target.** Stack onto the existing branch instead of opening a second PR into `dev`. The `dev` -> `main` promotion PR is its own slot.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) -- lint + typecheck + build on every PR and push to `main`/`dev`. Frozen lockfile.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) -- on push to `main`, build + deploy to GitHub Pages via OIDC. [`public/CNAME`](public/CNAME) ships `kalchar.co.in`.

### Versioning

SemVer, manual, currently pre-1.0.0. Every PR opens with a chosen version in [`CHANGELOG.md`](CHANGELOG.md) -- no `[Unreleased]`. On merge to `main`, tag the merge commit (`git tag v1.X.Y`) and push the tag.
- **Patch** (`0.x.Y`): typo, link, image swap, CSS tweak, new artwork.
- **Minor** (`0.X.0`): new section/page, content-model change, stack swap.
- **Major** (`X.0.0`): reserved until after 1.0.0 ships (= first public launch on the client's domain).

## Repo-specific rules

- **500-line file ceiling.** No `.tsx`, `.ts`, `.css`, `.json` source file may exceed 500 lines. Split before committing -- extract sub-component, lift styles to `globals.css`, pull data into JSON. `pnpm-lock.yaml` and `dist/**` are exempt. Bumping the ceiling is a real decision -- don't.
- **Latest stable everything.** Greenfield client work, no legacy users. Newest stable React/TS/Vite/Tailwind. No "safe but old" pins without documented constraint.
- **Image rights cleared (2026-05-17).** Hosting and using artwork imagery in this repo is fine.
- **No analytics, no tracking, no CDN font calls.** The static build is everything.
- **Client (Megha) does not write code.** Update flow: Sagar edits and ships. JSON-driven catalog is CMS-ready (Decap, Sanity, etc.) without restructuring if she ever wants self-edit.
