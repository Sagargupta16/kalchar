# MEMORY.md

_Started: 2026-05-24_
_Status: live in production on Vercel (kalchar.co.in). Phase 2 backend shipped (Neon + R2 + admin + Google auth). Ongoing work is content + UI polish._

This is the project knowledge file. It captures decisions and open questions. Everything in "Confirmed decisions" is what Sagar has explicitly stated.

Stacks on the workspace root [MEMORY.md](../../MEMORY.md). Never put PII here.

---

## Project goal

Build a website for **Megha Seth**, a traditional folk artist (family member of Sagar), where visitors can:

- Browse the archive of past artworks
- See "available to buy" pieces with prices and route a buy-intent through to WhatsApp / contact
- Submit custom-order requests
- Read about the artist and her services / workshops
- Find a contact path

**Phase 2 (later)**: full-stack with an admin panel where Megha (or Sagar acting as admin) signs in via Google OAuth, uploads new images, edits metadata, rearranges the gallery, and manages availability / prices.

Live URL: <https://kalchar.co.in/>.

---

## Confirmed decisions

| Decision | Value | Captured |
| --- | --- | --- |
| Artist | Megha Seth, family member of Sagar (not Sagar himself) | 2026-05-24 |
| Phase 1 data | Lives in the repo (`data/*.json`), no DB | 2026-05-24 |
| Phase 2 data | Database + admin panel + Google OAuth uploads | 2026-05-24 |
| Hard constraint | Folder / file structure must make the Phase 1 -> Phase 2 switch a **localized change**, not a rewrite. Treat data reads as one seam, keep route boundaries clean, keep deploy config in one place. | 2026-05-24 |
| Current focus | Content (catalog backfill via /admin) + public UI polish. Backend (DB/admin/auth) is built and live. | 2026-06-08 |
| Repo visibility | Public | 2026-05-24 |
| Hosting (current) | **Vercel** (Phase 2 shipped). `main` -> production (kalchar.co.in), `dev` -> preview. GitHub Pages retired (`deploy.yml` is a manual-only break-glass fallback). | 2026-06-05 |
| Migration posture | Same repo, same project. Phase 1->2 was a deploy-target + data-seam switch, not a rewrite (as designed). | 2026-05-24 |
| Stack: framework | Next.js 16 (App Router). Hybrid: public pages static/SSG, `/admin` + `/api` server-rendered on Vercel. (`output: "export"` retired with the move off Pages.) | 2026-06-08 |
| Stack: language | TypeScript (latest stable, strict) | 2026-05-24 |
| Stack: runtime | React 19 | 2026-05-24 |
| Stack: styling | Tailwind CSS 4 + shadcn/ui (copy-paste, Radix-based, lucide-react icons) | 2026-05-24 |
| Stack: motion | Motion 12 (formerly Framer Motion) for choreographed animations + Lenis for smooth scroll (lazy-loaded). Animations live in components or `globals.css` keyframes; `tw-animate-css` was removed in 1.7.5 (unused). | 2026-05-25 |
| Stack: lint/format | Biome 2 | 2026-05-24 |
| Stack: package manager | pnpm 10 | 2026-05-24 |
| Versions policy | Latest stable across the board. No "safe but old" pins without a documented constraint. | 2026-05-24 |
| Motion accessibility | Every animation respects `prefers-reduced-motion`. Non-negotiable. | 2026-05-24 |
| Design priority | **Mobile-first.** Most traffic arrives from WhatsApp / Instagram link-taps. Design and tune for mobile primarily, then scale up to tablet / desktop. | 2026-05-24 |
| Custom-orders route | `/custom-orders` (not `/commission`). The word "commission" stays out of nav, route names, and code identifiers. It can still appear in artist's voice copy in `data/site.json`. | 2026-05-24 |
| Catalog distinctness | All 21 artworks in `data/artworks.json` are **distinct pieces**. No duplicates, no auto-dedup. | 2026-05-24 |
| Nav structure | 5 items: Work / About / Workshops / Custom Orders / Contact. Mobile = hamburger menu (brand mark + menu button), desktop = horizontal row. | 2026-05-24 |
| Home page sections | Single-pager. Hero -> Marquee -> 01 Selected work -> 02 Available now (hidden when empty) -> 03 About teaser -> 04 Workshops teaser (top 3 + see all) -> 05 Custom orders teaser (3-step strip + WhatsApp CTA + brief-form link) -> 06 Contact teaser (WhatsApp / Insta / Email row) -> Footer. Each teaser inherits its route's pigment via `--section-accent`; deep-link routes (`/about`, `/workshops`, `/custom-orders`, `/contact`) stay intact for longer reads. | 2026-05-25 |
| Visual mood | Gallery / museum register. Restrained, whitespace-forward, the work is the hero. Warm cream + ink + single accent. Fine type. Pieces stand on their own merit. | 2026-05-24 |
| Motion intensity | Refined. Fade-up on scroll, subtle hover lifts on cards, tasteful page transitions. Motion 12 + Lenis (lazy-loaded). All respect `prefers-reduced-motion`. | 2026-05-24 |
| Motion exclusions | **No busy techy/mesh particles or game-like ornaments. No custom cursor** (use the user's native pointer). Elegant bespoke animations on the work itself are allowed: 3D card tilt, organic morphing watercolor backdrops, gold leaf shimmers. | 2026-05-27 |
| Reduced motion | This repo respects `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` + `usePrefersReducedMotion()` gates). Deliberate exception to Sagar's global "no reduced-motion" rule, confirmed 2026-07-07: public a11y-sensitive art site. Do not remove the gates. | 2026-07-07 |
| Corner radius | Two-tier (updated 2026-06-06, "Atelier" direction). `--radius-card` (~16px) for content surfaces (cards, panels, image plates, lightbox); `--radius` (`rounded-md`, ~6px) for pressable surfaces (buttons, fields, badges, alert boxes). Pills + theme toggle stay `rounded-full`. | 2026-05-24, 2026-06-06 |
| Gold-leaf mark | A single `✦` in `--color-gold-leaf` is an approved hero/eyebrow accent (decorative, `aria-hidden`). One restrained artist's-mark, NOT a repeating ornament. `--color-gold-leaf` has a dark-mode remap. | 2026-06-06 |
| Hero composition | Home hero uses two layered tilted artwork plates (front = featured LCP plate at -5deg + priority/preload; back = lazily-loaded second featured piece at +4deg). Reduced-motion flattens the stack. | 2026-06-06 |
| Header Contact CTA | On desktop, Contact is an accent-bordered `rounded-full` pill (fills on hover/active), separate from the 4 text nav links. Mobile drawer keeps all 5 links. | 2026-06-06 |
| Section accents | Each section sets its own pigment via the Section wrapper: about=marigold, workshops=pichwai, custom-orders=vermillion, contact=peacock. Hero + selected-work use the global accent. | 2026-05-24 |
| Copy rule: no double-dash | The literal `--` glyph is banned in user-facing copy. Replace with comma / period / colon / parentheses, or restructure. Applies to page metadata, JSX strings, dropdown options, and `data/*.json`. Internal code comments and JSDoc are exempt. | 2026-05-24 |

## Observable on disk (factual, not session-confirmed)

Things that are facts in the repo today but haven't been re-confirmed by Sagar in the current session. Don't treat as locked decisions; surface them when relevant.

| Field | Repo state |
| --- | --- |
| Domain | `kalchar.co.in` (apex, GoDaddy DNS A -> Vercel) |
| Hosting | **Vercel** (Phase 2). `main` -> production, `dev` -> preview. `deploy.yml` GitHub-Pages workflow is a retired manual-only break-glass fallback. |
| Default branch | `main` (active work on `dev`, ahead of `main`) |
| Catalog source | **Neon Postgres** (Drizzle), read via `lib/data.ts`. `data/artworks.json` is the one-shot seed source for `pnpm db:seed`, NOT read at runtime. |
| Workshops source | **Neon Postgres** (`workshops` table), admin-editable at `/admin/workshops`. `site.json` `workshops[]` is seed-only. |
| Palette | Auto-extracted from the image via sharp on admin upload (`extractPalette` in `lib/storage/process-artwork-image.ts`); re-derivable per-piece from the admin panel. Seed pieces use hand-picked swatches in `artworks.json`. |
| Artwork images | **Cloudflare R2** (sharp variants: 400/800/1200/1600 in avif/webp/jpg). `public/artworks/` JPGs are the regenerate source, not served. |
| Logo | [public/logo.jpg](public/logo.jpg), [public/logo-180.png](public/logo-180.png) |

## Open questions

Queued for the moment Sagar invites discovery. **Do not ask unprompted.**

### About the artist

1. Voice / tone for site copy. Formal traditional-artist register, or warm-personal?
2. Years practicing? Self-taught or trained?
3. Where is she based? (Local pickup vs courier vs international shipping affects buy-flow copy.)
4. Existing online presence to link or import from? (Instagram, etc.)

### About the audience

1. Typical buyer profile. Friends, Instagram followers, strangers via search? Local, pan-India, international?
2. Typical price range of pieces sold? (Changes visual treatment: ₹500 sketch vs ₹50,000 canvas read very differently.)

### About artwork metadata (the catalog shape)

1. Fields needed beyond what already exists: title, year, medium, size (cm / in), status (archive / available / sold), price (when available), description, tags?
2. Can a single piece have multiple images (front, detail, framed shot, in-situ)?
3. Are workshops kept on the site, dropped, or grown into something schedulable (dates / seats)?

### About contact + orders

1. WhatsApp number for "buy this" and "custom order" deep-links?
2. Custom-order form fields wanted: size, medium preference, subject, budget, deadline, reference image upload?
3. Direct WhatsApp pre-filled message, or form-then-push-to-WhatsApp on submit?

### About Phase 2 (later, but worth pre-deciding)

1. Admin is Megha, Sagar, or both? Determines OAuth allowlist + UX expectations.
2. Anyone else needs admin access?
3. Long-term goal. Vanity portfolio, side income, full-time business? Affects whether to plan for inventory tracking, multi-currency, etc.

### About branding / look

1. Existing [logo.jpg](public/logo.jpg). Use as-is, refine, or redesign?
2. Mood: minimalist gallery, warm-personal, bold-colourful, luxury, artisan-crafted?
3. References. Any artist portfolios Sagar likes as inspiration (Saatchi, Behance, specific names)?

---

## Architecture

The full, maintained system picture lives in the [docs suite](docs/README.md) -- start at [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then DATABASE / AUTH / IMAGES / DEPLOYMENT / DEVELOPMENT. The repo layout is documented in [CLAUDE.md](CLAUDE.md) ("What's on disk"). This file no longer duplicates the tree (it drifted); those are the source of truth.

The one principle that still governs everything: **`lib/data.ts` is the data seam.** Phase 1 read `data/*.json`; Phase 2 swapped it to async Drizzle queries against Neon, and nothing else in the UI changed. That seam is why the Phase 1 -> Phase 2 migration was localized, exactly as planned. `getSite()` stays sync (reads `data/site.json` chrome); the catalog getters are async DB reads. Images moved to Cloudflare R2 (sharp variants); `public/artworks/` is the regenerate source, not served.

---

## Current state on disk

Live in production on Vercel (kalchar.co.in), Next.js 16 hybrid build (36 routes). Active work lands on `dev`, PRs into `dev`, then `dev` -> `main` promotes to production. Public site (home single-pager, `/work` gallery + `/work/[slug]` SSG details, `/about`, `/workshops`, `/custom-orders`, `/contact`) is static/SSG; `/admin` (dashboard + artwork/workshop/category/preset/maintainer managers) and `/api/auth` are server-rendered. Catalog reads from Neon via the `lib/data.ts` seam; images from R2. Theme toggle is light/dark only (system following was dropped). Contact surfaces WhatsApp / Instagram (art + community) / YouTube / email.

Verified each PR with `pnpm typecheck` + `pnpm lint` + `pnpm build` (no automated test suite; that trio + the production build is the regression net).

---

## Roles

- **Megha Seth**: the artist. Owns all artwork rights. Does not write code.
- **Sagar Gupta**: developer. Sole maintainer.

---

## What happens next

Likely candidates (Sagar drives the order):

1. Backfill metadata (`priceInr`, `dimensions`, `year`) for the pieces that should be for sale, via the admin panel (`/admin`).
2. Re-shoot or crop the artwork photos that have hands / clothespins / pots / wood floors visible.
3. Ongoing content + UI polish, shipped via `dev` -> `main` PRs (CI: lint + typecheck + build; Vercel deploys `main` to kalchar.co.in on merge).

## Design direction note (2026-06-06)

A full "premium 2026 SaaS" redesign (PRs #31-36) rebuilt the UI on a 3-tier
design-token system with 7 reusable primitives (Section, Container,
PageHeader, Card, Badge, IconCircle, ChannelLink) and **removed the folk-art
decor layer** (ink-splash, pigment-wash, motifs, marquee, brush-strokes). The
look is now cleaner / more gallery-minimal than the watercolor-backdrop +
motif identity described in the "Confirmed decisions" table above. If the
folk-art mood is wanted back, that's a deliberate re-add, not a regression.
