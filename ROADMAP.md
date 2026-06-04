# ROADMAP.md

_Created: 2026-06-04_
_Owner: Sagar Gupta (sole maintainer)_
_Status: planning document. Nothing here is committed work until promoted into a PR._

Forward plan for [kalchar.co.in](https://kalchar.co.in/). Stacks on [MEMORY.md](MEMORY.md) (locked decisions) and [CLAUDE.md](CLAUDE.md) (repo rules). Where this file and MEMORY.md disagree on a **decision**, MEMORY.md wins; this file is the **plan of what to do next**, not a re-litigation of locked choices.

Three tracks, run in this order of priority:

1. **Track A: UI / performance / mobile fixes** (do first, ships on the current free GitHub Pages deploy)
2. **Track B: Phase 2 backend** (DB + image storage + admin + auth, triggered later)
3. **Track C: AWS migration** (optional, with GitHub Pages as the permanent fallback)

---

## Ground truth (verified 2026-06-04, not assumed)

Before planning, the codebase was audited. Correcting two myths so the plan targets the real problem:

| Claim | Verdict | Evidence |
| --- | --- | --- |
| "28 MB raw JPGs are served, that's the hang" | **FALSE in production** | `public/_opt/artworks/` holds 273 generated variants (AVIF/WebP/JPG at 400/800/1200/1600w, ~70 MB on disk, gitignored). [art-image.tsx](components/gallery/art-image.tsx) serves them via `<picture>` + `srcset`. `pnpm build` runs `optimize:images` then `prune-build.mjs` to strip masters from `out/`. Prod ships optimized images. |
| "Image pipeline is the #1 cause of jank" | **Unlikely in prod** | Images are responsive and lazy. The real suspects are the **JS/animation layer** (below). The raw-master risk only bites in `pnpm dev` (no `_opt/` step) or if a build skips `optimize:images`. |

So "website hangs" is almost certainly **main-thread / animation cost**, not bytes over the wire. Track A targets that.

---

## Track A: UI, performance, and mobile fixes

Ordered by impact-to-effort. Each item has a concrete file target and a verify step. Ship in small PRs into `dev`, promote to `main` in batches.

### A1. Animation / "hang" performance (HIGH)

The home and `/work` pages run a lot of concurrent animation work. Each finding below is from the audit with file:line evidence.

| # | Issue | File | Fix | Verify |
| --- | --- | --- | --- | --- |
| A1.1 | **Two rAF loops fight on scroll** — Lenis raf loop + ScrollProgress rAF both fire per frame (~120 callbacks/s on mobile) | [components/motion/smooth-scroll.tsx](components/motion/smooth-scroll.tsx), [components/decor/scroll-progress.tsx](components/decor/scroll-progress.tsx) | Drive ScrollProgress off Lenis's own `scroll` event (single loop) instead of a second rAF; or gate ScrollProgress behind `matchMedia(min-width)` so it's desktop-only | Chrome DevTools Performance trace on mobile emulation: one rAF loop, no long tasks > 50 ms during scroll |
| A1.2 | **3D tilt = 6 springs/card × ~21 cards = ~126 spring solvers** on `/work` | [components/gallery/artwork-card.tsx:47-60](components/gallery/artwork-card.tsx) | Disable tilt on touch/coarse pointers via `matchMedia("(hover: hover) and (pointer: fine)")`; tilt is a desktop-only delight. Touch devices get static cards. Drop spring `stiffness` 120 → ~90 on desktop | On mobile, swiping the grid is smooth; no tilt recalc. Desktop tilt unchanged |
| A1.3 | **Lenis vs native momentum on iOS** — `touchMultiplier: 1.5` fights native scroll | [components/motion/smooth-scroll.tsx:40](components/motion/smooth-scroll.tsx) | Consider `smoothTouch: false` (let mobile use native scroll; Lenis smooth is a desktop nicety). This alone often fixes "janky/hangy" feel on phones | Scroll on a real phone (or BrowserStack iOS Safari) feels native, no rubber-band fighting |
| A1.4 | **Marquee infinite animation** always composites on home | [components/decor/marquee.css:25](components/decor/marquee.css) | Pause when off-screen via IntersectionObserver, or `prefers-reduced-data` / low-end media query. Already pauses on hover; extend to off-viewport | Performance trace: marquee layer not repainting when scrolled past |
| A1.5 | **InkSplash animates 5-7 SVG ellipses**, multiple instances per page; SVG attr animation is weak on iOS | [components/decor/ink-splash.tsx:102-191](components/decor/ink-splash.tsx) | On coarse-pointer / reduced-motion, render the splash static (final frame). Keep the lush version for desktop | Mobile trace shows no continuous SVG repaint on hero |
| A1.6 | **SplitText = 60-80 `motion.span`** per hero text block, 12 ms stagger | [components/motion/split-text.tsx:24-46](components/motion/split-text.tsx) | Reduce per-char delay to ~6-8 ms; consider word-level split for long blocks to cut node count | Hero entrance feels the same, fewer DOM nodes, faster hydrate |
| A1.7 | **Header re-renders per scroll** (state flip at scrollY>80 → layout recalc) | [components/layout/site-header-client.tsx:83-98](components/layout/site-header-client.tsx) | Add `contain: layout` to header; ensure the className swap only toggles compositor-friendly props (shadow/bg), not layout-affecting padding | No forced reflow in scroll trace |

**A1 exit criteria:** Lighthouse mobile Performance ≥ 90; no long task > 50 ms during a scroll-through of home + `/work`; smooth on a real mid-range Android.

### A2. Mobile-friendliness (HIGH)

| # | Issue | File | Fix |
| --- | --- | --- | --- |
| A2.1 | **iOS scroll-lock + 100dvh** — body `overflow:hidden` on drawer open can thrash the viewport when the iOS address bar collapses | [components/layout/site-header-client.tsx:73-76](components/layout/site-header-client.tsx) | Lock with `position: fixed; top: -scrollY` pattern (preserve + restore scroll), or use Lenis's `stop()`/`start()`. Verify on real iOS Safari |
| A2.2 | **`onMouseMove` fires on touch**, no `touch-action` → can delay pinch/scroll | [components/gallery/artwork-card.tsx:104](components/gallery/artwork-card.tsx) | Resolved for free by A1.2 (no tilt on touch). Belt-and-braces: `touch-action: manipulation` on the card |
| A2.3 | **Touch targets / tap area** audit on nav, filter pills, channel rows | [components/layout/](components/layout/), [components/gallery/work-filter.tsx](components/gallery/work-filter.tsx) | Ensure ≥ 44×44px hit areas; check filter pills wrap cleanly at 360px width |
| A2.4 | **Horizontal overflow** risk from marquee / wide rails at 320-360px | [components/decor/marquee.tsx](components/decor/marquee.tsx), home rails | Test at 320px; ensure `overflow-x: clip` on band wrappers, no element pushes past `100vw` |
| A2.5 | **Type scale on small screens** — confirm hero/headings don't overflow or force zoom | [app/globals.css](app/globals.css) | Verify fluid `clamp()` sizing holds at 320-768px |

**A2 exit criteria:** No horizontal scroll at 320px. Drawer open/close stable on iOS Safari. All interactive targets ≥ 44px. Manual pass on real phone + Chrome/Safari device emulation.

### A3. Internet research to do BEFORE coding A1/A2

The user asked to "do learning on Internet first." Read these (Context7 / official docs) before touching the animation layer, so fixes match current best practice:

- **Motion (v12) performance** — `useSpring`/`useMotionValue` cost, `LazyMotion` + `domAnimation` to shrink bundle, `MotionConfig reducedMotion`. (Context7: `motion` / `framer-motion`.)
- **Lenis on mobile** — official guidance on `smoothTouch`, when to disable on touch. (Lenis GitHub README.)
- **Core Web Vitals** — INP (replaced FID in 2024) is the metric for "hang/jank"; target < 200 ms. LCP < 2.5 s, CLS < 0.1. (web.dev/vitals.)
- **`content-visibility: auto`** for below-the-fold sections (cheap win to skip offscreen render/paint). (web.dev.)
- **Passive event listeners + `will-change` hygiene** — overuse of `will-change` wastes GPU memory.

Capture anything non-obvious into MEMORY.md as it's confirmed.

### A4. UI polish backlog (MED, post-perf)

These are quality passes once perf/mobile are solid. Use the design skills (`polish`, `make-interfaces-feel-better`, `baseline-ui`) per item:

- Re-audit section-accent consistency (marigold/pichwai/vermillion/peacock) across teasers vs deep routes.
- Empty/edge states: `/work` filter with zero matches, "Available now" when empty (already conditional).
- Form affordances on `/custom-orders` (already has success state in 1.16.0; verify on mobile).
- Focus-visible rings + keyboard nav across nav, filter, lightbox.
- Lighthouse Accessibility ≥ 95.

---

## Track B: Phase 2 backend (DB, image storage, admin)

Triggered when Megha/Sagar want to manage the catalog without code edits. **The whole design rests on the data seam** at [lib/data.ts](lib/data.ts) — UI never learns where data comes from. This track is host-agnostic; Track C decides where it runs.

### B1. The seam (already in place — do not break it)

Every catalog read goes through `lib/data.ts`. Phase 2 swaps its body from JSON-file reads to DB queries. **No other file changes.** Keep it that way: never import `data/*.json` outside this file (CLAUDE.md rule).

### B2. Database — recommendation

| Option | Fit | Cost | Verdict |
| --- | --- | --- | --- |
| **Turso (libSQL/SQLite) + Drizzle** | Tiny catalog, read-heavy, edge-friendly | Free tier generous | **Recommended for non-AWS path.** Simplest, cheapest, Drizzle types flow into the seam |
| **Neon (Postgres) + Drizzle** | If you want Postgres semantics | Free tier | Good if Phase 2 grows relational (orders, workshop bookings) |
| **DynamoDB** | If on AWS (Track C) | Pay-per-request, ~free at this scale | **Recommended for AWS path.** Single-table for artworks; fits the seam fine |
| **Aurora Serverless v2 (Postgres)** | AWS + relational | Has a floor cost (ACU minimum) | Overkill for a portfolio; only if it becomes a real business |

**Decision rule:** non-AWS → Turso. AWS → DynamoDB. Either way Drizzle (or the Dynamo SDK) lives behind the seam, so the choice stays a one-file change. Defer the final pick to Phase 2 kickoff per MEMORY.md.

### B3. Image storage

Today: 21 masters in `public/artworks/`, variants generated at build into `_opt/`. Phase 2 needs **uploads at runtime**, so images move off the repo:

| Path | Storage | CDN | Notes |
| --- | --- | --- | --- |
| Non-AWS | **Cloudflare R2** or **Vercel Blob** | R2 has free egress via CF | R2 recommended (no egress fees) |
| AWS | **S3** | **CloudFront** | Standard; lifecycle rules optional |

**Runtime optimization** (replacing the build-time `optimize-images.mjs`): generate variants on upload (a serverless function calling `sharp`), or use an on-the-fly image service (Cloudflare Images, Vercel Image Optimization, or `next/image` with a custom loader → see Next static-export loader docs). Store the master + emit responsive variants on write. The `<picture>`/srcset contract in [art-image.tsx](components/gallery/art-image.tsx) stays the same; only the URL base changes.

### B4. Admin + auth

Per MEMORY.md Phase 2 plan:

1. Drop `output: "export"` from [next.config.mjs](next.config.mjs) — same project now serves dynamic routes.
2. `app/api/*` route handlers for CRUD.
3. **Auth.js v5 (NextAuth) + Google OAuth**, allowlist of admin emails (Megha and/or Sagar — open question in MEMORY.md line 104).
4. `app/admin/*` (folder reserved): upload, edit metadata, reorder, set price/availability, view custom-order submissions.
5. One-shot migration script: `data/*.json` → DB rows, then retire `/data/`.

**AWS auth alternative:** Cognito with Google federation, or keep Auth.js (it runs anywhere). Keeping Auth.js means the auth layer doesn't change between hosts — recommended.

### B5. Phase 2 sequencing

```
B2 pick DB ──> B1 rewrite lib/data.ts to query it (seam swap)
                      │
B3 move images to object storage + runtime variants
                      │
B4 de-export, add /api, Auth.js, /admin pages
                      │
   one-shot JSON->DB migration, delete /data
```

Each step is independently shippable behind the seam except B4 (de-export flips hosting — coordinate with Track C).

---

## Track C: AWS migration (optional, GitHub Pages stays as fallback)

**Posture:** GitHub Pages is the **permanent fallback** and the **current production**. AWS is pursued only as (a) a consulting/portfolio showcase, or (b) the necessary host once Phase 2 needs a server runtime (Pages can't do SSR/API). Until then, **do not move off Pages** — it's free and working.

### C0. Fallback guarantee

- Keep [.github/workflows/deploy.yml](.github/workflows/deploy.yml) (Pages OIDC deploy) intact on `main`.
- AWS deploy lands as a **separate workflow** (`deploy-aws.yml`), gated by a manual `workflow_dispatch` or a branch/flag — never auto-replacing Pages until cutover is proven.
- DNS (`kalchar.co.in`) only moves at the final, deliberate cutover step. Rollback = repoint DNS back to Pages. `public/CNAME` stays in the repo.

### C1. Two AWS target shapes

| Shape | When | Pieces |
| --- | --- | --- |
| **C1a. S3 + CloudFront** (static) | Phase 1 stays static; AWS as showcase only | S3 bucket, CloudFront dist, ACM cert (us-east-1), Route 53 or external DNS |
| **C1b. Amplify Hosting** (SSR) | Phase 2 needs server runtime | Amplify app connected to GitHub, Next SSR adapter, branch deploys, built-in CDN + PR previews |

Amplify confirmed (AWS docs) to support Next.js **SSR** with Git-based CI/CD, custom domains, PR previews, atomic deploys. For the Phase 2 dynamic site, **Amplify Hosting is the lowest-friction AWS path** — it ingests the GitHub repo directly and handles the SSR build, so it largely replaces the hand-rolled workflow.

### C2. GitHub Actions OIDC for AWS (for the S3+CloudFront path, C1a)

No long-lived AWS keys in GitHub. Five pieces:

1. **IAM OIDC provider** (once per account): URL `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`. (AWS now auto-validates the thumbprint.)
2. **IAM role** with trust policy pinned to this repo + branch:
   ```json
   "StringLike": {
     "token.actions.githubusercontent.com:sub": "repo:Sagargupta16/megha-art-portfolio:ref:refs/heads/main"
   }
   ```
   (Use `:environment:production` instead if gating behind a GitHub Environment.)
3. **Least-privilege policy** on the role: `s3:PutObject/DeleteObject/ListBucket` on the bucket ARNs + `cloudfront:CreateInvalidation` on the distribution ARN. Nothing more.
4. **S3 bucket + CloudFront distribution + ACM cert** for `kalchar.co.in`.
5. **`deploy-aws.yml`**: `id-token: write` (already present in current workflow) → `aws-actions/configure-aws-credentials@v4` (role ARN + region) → `aws s3 sync out/ s3://<bucket> --delete` → `aws cloudfront create-invalidation --paths "/*"`.

**Zero GitHub secrets.** Account ID and distribution ID are fine as repo Variables (the trust policy is the gate, not secrecy).

For the **Amplify path (C1b)**, OIDC/Actions is largely moot — Amplify connects to GitHub via its own app and builds on push. Actions OIDC only matters if you keep building artifacts yourself and push to S3.

### C3. Cost reality

| Setup | Monthly (low-traffic portfolio) |
| --- | --- |
| **GitHub Pages** (current) | **$0** |
| S3 + CloudFront (static) | ~$0.50-2 (S3 storage + CF requests; mostly free-tier) |
| Amplify Hosting (SSR) | Build minutes + hosting; ~$0-5 at this traffic, but has more moving parts |
| + DynamoDB | ~$0 (pay-per-request, negligible at this scale) |
| + S3 image storage | cents |

AWS here is **pennies**, but it's non-zero ops and a cert/DNS to babysit. The justification is showcase or Phase-2-SSR-necessity, not cost or performance.

### C4. Cutover checklist (when it happens)

1. Stand up AWS target in parallel (S3+CF or Amplify), deploy a copy, test on the CloudFront/Amplify URL.
2. Verify parity: all 30 static pages, images, forms, WhatsApp deep links, sitemap, robots.
3. Lower DNS TTL ahead of time.
4. Repoint `kalchar.co.in` to CloudFront/Amplify.
5. Watch for 24-48h. **Rollback = repoint DNS to Pages** (workflow + CNAME untouched).
6. Only after stable: optionally retire the Pages workflow (or keep it as a warm standby).

---

## Decision summary (one strong rec per fork)

| Fork | Recommendation | Why |
| --- | --- | --- |
| Fix order | **Track A first, fully**, before any backend/AWS work | The "hang" and mobile complaints are live UX bugs on a shipped site. Backend/AWS are future. |
| "Hang" root cause | **JS/animation layer, not images** | Verified: prod serves optimized `_opt/` variants. Target Lenis+rAF, card tilt, SVG splash. |
| Phase 1 hosting | **Stay on GitHub Pages** | Free, working, zero ops. Don't migrate a static site for no gain. |
| Phase 2 DB | **Turso (non-AWS) or DynamoDB (AWS)** | Both sit behind the seam; pick at kickoff. Cheapest options that fit. |
| Image storage (P2) | **Cloudflare R2 (non-AWS) / S3+CloudFront (AWS)** | R2 = no egress fees; S3 if already on AWS. |
| AWS migration | **Only for showcase or Phase-2 SSR**, with Pages as permanent fallback | Pennies in cost but real ops; no perf benefit for a static site. Amplify Hosting if SSR. |

---

## Immediate next actions (Track A, this is the live work)

1. **Research pass** (A3): read Motion v12 perf, Lenis mobile guidance, INP/CWV, `content-visibility`. Capture findings.
2. **A1.3 + A1.1** first (biggest "hang" wins, lowest risk): disable Lenis smoothTouch on mobile, collapse the double rAF loop.
3. **A1.2**: gate card tilt behind `(hover: hover) and (pointer: fine)`.
4. **A2.1**: fix iOS scroll-lock.
5. Measure with Lighthouse mobile + a real device after each batch; don't claim "fixed" on code alone (CLAUDE.md verification rule).
6. Ship in small PRs into `dev`; batch-promote to `main`; bump version + CHANGELOG per repo rules.

> Nothing in Track B or C starts until Sagar explicitly triggers it. This file is the map, not a mandate to execute.
