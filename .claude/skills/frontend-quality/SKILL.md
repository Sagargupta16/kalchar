---
name: frontend-quality
description: Pre-ship UI quality gate for this Next.js art-portfolio -- accessibility (WCAG, reduced-motion), performance (Core Web Vitals, image/bundle), and SEO (metadata, JSON-LD, sitemap, OG). Mobile-first, since most visitors arrive from WhatsApp/Instagram link-taps on phones. Audits and fixes against the repo's documented motion/color/copy rules.
when_to_use: |
  Trigger on: "is this accessible", "a11y", "check accessibility", "make it mobile friendly", "why no motion / reduce motion", "is it fast", "performance", "Lighthouse", "Core Web Vitals", "SEO", "metadata", "OG image", "is this ready to ship visually", or before shipping a new page/section. Pairs with the design skills (frontend-design, polish, adapt) for fixes.
---

# frontend-quality

A pre-ship gate for the three things Sagar repeatedly asks about on this site: **accessibility, performance, SEO** -- all mobile-first. Audit, then fix against the repo's house rules.

## Context: who visits

Most traffic is **phone, from WhatsApp / Instagram link-taps**. Design + audit for phone width first, then scale up. A desktop-only check is incomplete.

## 1. Accessibility (WCAG 2.1 AA)

- **Reduced motion** is policy here: `MotionConfig reducedMotion="user"` at the root + an explicit `usePrefersReducedMotion()` gate for anything Motion's config can't reach (raw `useSpring`, animated SVG attrs). MEMORY.md "Motion exclusions" is source of truth. Every animation must degrade.
- Prefer **native elements over ARIA roles** (`<ul>/<li>/<nav>/<button>`, not `role=`). (We fixed 8 such Sonar findings.)
- Contrast >= 4.5:1 (text), 3:1 (large/UI). All color via CSS custom properties -- check both light + dark.
- Every interactive element: keyboard-reachable, visible focus ring, accessible name (aria-label where text is absent, e.g. icon buttons). Decorative elements `aria-hidden`.
- Images: meaningful `alt` (the gallery uses `artworkAlt()` fallback); decorative plates `alt=""`.
- Min tap target ~44px on mobile.
- Quick check: keyboard-tab the page, run an axe pass if available, verify `prefers-reduced-motion` kills all motion.

## 2. Performance (Core Web Vitals, mobile)

- **LCP**: the hero front plate / detail image is the LCP -- it must `priority` + preload (see `artworkPreloadSrcset`, `maxWidth` capping). Don't add a second eager hero image.
- **Images**: served from R2 as AVIF/WebP/JPG x 4 widths via `<picture>` (`lib/image-base.ts`, `components/gallery/art-image.tsx`). New imagery goes through that pipeline, never a raw `<img src>` of a master.
- **CLS**: reserve aspect ratio (`aspect-3/4`) so plates don't reflow; fonts use `next/font` (no FOUT shift).
- **JS**: Motion + Lenis are lazy-loaded; keep it that way. Watch bundle growth on new deps. `next build` prints route sizes -- compare before/after.
- **Motion cost**: animate compositor-friendly props (opacity/transform), not layout (width/top). Gate springs to `(hover:hover) and (pointer:fine)` like SmoothScroll does, so phones don't pay for desktop motion.
- Tools: `next build` for bundle/route sizes; PageSpeed Insights / Lighthouse for field CWV (no Lighthouse skill installed -- run it manually or via a perf MCP if added).

## 3. SEO

- **Per-page metadata**: every route exports `metadata` (title via the `%s · {publicName}` template, description). No literal ` -- ` in title/description (house rule).
- **JSON-LD**: the `Person` block in `app/layout.tsx` (`sameAs` now includes IG + YouTube). Artwork detail pages should carry image OG. Keep structured data truthful.
- **OG/Twitter**: `openGraph` + `twitter` cards set; artwork detail uses the 1200px webp variant.
- **sitemap + robots**: `app/sitemap.ts` (SSG from Neon) + `public/robots.txt`. New routes must appear in the sitemap.
- **URLs** from `lib/site-config.ts` (`siteConfig.url`/`prodUrl`), never hardcoded.
- **Canonical**: one canonical host (kalchar.co.in); don't leak vercel preview URLs into metadata.

## Workflow

1. Identify scope (one component / one page / whole site).
2. Audit each of the three axes above; report findings as `file:line | axis | issue | fix | severity`.
3. Fix the safe, clear ones (respecting clean-code + house rules); for design-judgment calls, pair with `polish`/`adapt`/`frontend-design`.
4. **Verify**: `pnpm build` (route sizes + that nothing broke) + a real mobile-width check (Playwright is an installed dep -- can drive a headless viewport). Never claim "accessible/fast" on static reasoning alone for a visible change; load it.
5. Hand off to `ship-it` when green.

## Notes

- House rules that double as quality rules: mobile-first, `rounded-md` everywhere, named motion tokens, no raw hex, no ` -- ` in copy, 500-line file ceiling.
- Don't add the banned ornaments (busy mesh/lattice/particle, custom cursor) in the name of "polish".
