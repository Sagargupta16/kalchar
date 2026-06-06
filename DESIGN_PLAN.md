# Design Implementation Plan: "The Atelier" full-shell direction

## Summary

- **Scope:** Full site shell (header, hero, work cards, footer chrome) + design tokens
- **Winning direction:** Variant E — "The Atelier" (warm, tactile, layered, gold-leaf)
- **Carry-over elements (all four approved):**
  1. Layered hero plates (two overlapping tilted artwork plates)
  2. Gold-leaf accents (`✦` mark + gold eyebrow tint, existing `--color-gold-leaf`)
  3. Softer card radius (cards/panels only, via a new `--radius-card` tier)
  4. Pill nav + accent-filled Contact chip in the header
- **Locked + preserved:** `Kalचर by Megha` wordmark + Devanagari core, all content/copy/nav, light+dark, mobile-first, WCAG AA, `prefers-reduced-motion`.
- **Rollout:** Home page + shell first. Once approved live, propagate to `/about`, `/workshops`, `/custom-orders`, `/contact`, `/work` cards.

This is an *evolution* of the current museum register, not a replacement. It pushes warmth and tactility while keeping "the work is the hero."

---

## Decisions that change locked rules (require MEMORY.md + CLAUDE.md updates)

| Locked rule today | Change | Why |
| --- | --- | --- |
| "Subtle, consistent corner radius (`rounded-md` ~6px) on every surface" | Split into two tiers: **`--radius-card` (~16px)** for cards/panels/image plates, **`--radius` (~6px)** kept for fields, buttons, badges. Pills + theme toggle stay `rounded-full`. | The Atelier's tactile warmth comes from softer card corners; buttons/fields staying tighter keeps them legible and "pressable". A two-tier radius scale is still a system, not drift. |
| "Banned: ... game-like ornaments" (motifs are eyebrow-only) | Add a **single** gold-leaf `✦` glyph as an approved hero/eyebrow accent (not a repeating ornament). | One restrained artist's-mark, gold-leaf is already an allowed material. Stays inside "no busy ornament" because it is singular and static. |

Everything else stays inside the existing locked decisions.

---

## Files to change

### Tokens
- [ ] `app/globals.css` — add `--radius-card` to `@theme`; add a gold-leaf eyebrow helper class (`.t-eyebrow-gold` or reuse `text-(--color-gold-leaf)`); confirm `--color-gold-leaf` reads correctly in dark mode (it currently only has a light value — add a dark remap).

### Shell
- [ ] `components/layout/site-header-client.tsx` — append an accent-filled `rounded-full` **Contact** pill after the nav list (desktop); keep the existing 5-link nav. Mobile drawer unchanged.
- [ ] `components/layout/site-footer.tsx` — adopt `--radius-card` on any panel surfaces (footer is mostly type, low impact; verify the Maintainer-login Lock row is untouched).

### Hero (the signature move)
- [ ] `components/home/hero.tsx` — replace the single featured `<ArtImage>` plate with **two layered plates**: the featured piece in front (tilted ~ -5°), a second featured piece behind (tilted ~ +4°), each with a white border + soft shadow + `--radius-card`. Add a gold `✦` to the eyebrow line. Gate the tilt behind `usePrefersReducedMotion()` (raw transform — Motion's global config does NOT neutralize it; mirror `artwork-card.tsx:52`). Keep the existing eager LCP behavior: the **front** plate is the LCP image and keeps `priority` + `maxWidth={800}` + the preload link.

### Cards
- [ ] `components/gallery/artwork-card.tsx` — bump the plate + card container to `--radius-card`. Keep the gold-leaf hover double-border (already present). Keep `Available` Check badge.
- [ ] `components/home/*-teaser.tsx`, `app/*/page.tsx` panels — swap `rounded-md` → `--radius-card` on card/panel surfaces only (not buttons/fields).

### Tilt motion helper
- [ ] Reuse the existing `usePrefersReducedMotion()` + `useFinePointer()` hooks. No new dependency. Named tokens only: tilt transition uses `--duration-base` + `--ease-out-soft`.

---

## Implementation steps (in order)

1. **Tokens first.** Add `--radius-card: 1rem;` to `@theme` in `app/globals.css`. Add a `:root.dark` remap for `--color-gold-leaf` (currently light-only — pick a slightly lifted value so it reads on near-black). Verify Tailwind generates `rounded-(--radius-card)` utility.
2. **Contact pill.** In `site-header-client.tsx`, add the accent-filled `rounded-full` Contact link to the desktop nav row. Active-route logic unchanged. Verify focus-visible ring + 44px tap target.
3. **Layered hero plates.** In `hero.tsx`, wrap the featured plate in a relative container; add a second absolutely-positioned plate behind. Front plate keeps `priority`/preload (LCP). Gate both tilts on `!reduceMotion && finePointer`. Add gold `✦` to the eyebrow.
4. **Card radius.** Apply `--radius-card` to `artwork-card.tsx` plate + container, then the teaser/page panel surfaces. Leave buttons, inputs, badges, pills as-is.
5. **Dark-mode + a11y sweep.** Re-run the audit harness (axe-core both themes, contrast on the gold accents, reduced-motion check that tilts flatten).
6. **Propagate.** Once home + shell is approved live, roll `--radius-card` + gold eyebrow to the four inner pages.

---

## Required UI states

- **Reduced motion:** hero plates render flat (no tilt), gold `✦` static. Verified via `usePrefersReducedMotion()` gate + `prefers-reduced-motion` media query.
- **Touch / coarse pointer:** plates static (no tilt), per `useFinePointer()` — same gate the gallery cards use.
- **Dark mode:** gold-leaf, white plate borders, and card shadows all re-tuned for near-black ground.
- **No-JS / crawler:** hero plates still render (images are SSR `<picture>`; tilt is a progressive enhancement only).

## Accessibility checklist

- [ ] Contact pill: visible `focus-visible` ring, ≥44px tap target, accent fill passes AA on `text-bg`.
- [ ] Gold `✦` is `aria-hidden` (decorative).
- [ ] Hero plate tilt respects reduced-motion + coarse pointer.
- [ ] Card radius change does not affect focus-ring visibility.
- [ ] Re-run axe-core (both themes) → 0 violations; Lighthouse a11y stays 100.

## Performance checklist

- [ ] Front hero plate keeps `priority` + `maxWidth={800}` + the `<link rel="preload">` so LCP is unaffected.
- [ ] Second (back) plate is NOT priority and NOT preloaded — it loads lazily so it doesn't compete with the LCP image.
- [ ] No new JS dependency (reuse existing hooks + Motion).
- [ ] CLS stays 0 (plates have fixed aspect-ratio containers).

## Design tokens

- **New:** `--radius-card` (~1rem / 16px).
- **New (dark):** `:root.dark { --color-gold-leaf: <lifted value>; }`.
- **Reused:** `--color-gold-leaf`, `--duration-base`, `--ease-out-soft`, `--section-accent`, `--radius` (kept for fields/buttons).

---

*Direction selected from the Design Lab (Variant E "The Atelier"). Lab files removed on finalize.*
