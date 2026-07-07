---
name: clean-code
description: Use when writing, fixing, editing, reviewing, or refactoring any code in this repo (TypeScript, React/TSX, Next.js, JSON data). A-to-Z Clean Code catalog (Robert C. Martin) adapted to this project's stack and house rules -- names, functions, comments, DRY/general quality, tests, plus kalchar-specific style and architecture rules.
when_to_use: |
  Trigger on any of: cryptic identifiers (`d`, `x`, `co`, `proc`); functions with 4+ positional args or boolean flag params; duplicated logic across components/server actions; magic numbers or raw timings; commented-out code, stale/metadata comments; deep nesting; chained property access; missing edge-case coverage; OR asks like "rename this", "split this function", "clean this up", "any quick wins", "while you're at it", "is this still used", "is this comment useful". Also fires alongside the repo style rules below (the ` -- ` ban, raw hex, magic timings, 500-line files, the data seam).
---

# Clean Code (kalchar / megha-art-portfolio)

The complete Clean Code catalog, adapted to **this repo's stack** (Next.js 16 + React 19 + TypeScript strict + Tailwind 4 + Biome 2) and **its house rules**. Examples are TypeScript/TSX, not Python.

This one skill replaces the former `boy-scout`, `clean-names`, `clean-functions`, `clean-comments`, `clean-general`, and `clean-tests` skills.

---

## 0. The Boy Scout Rule (the mindset that orchestrates the rest)

Apply cleanup only when the task IS cleanup (review, refactor, "clean this up" asks). When writing or fixing code, follow the sections below for the NEW code you write; do not expand the diff with drive-by improvements to adjacent code (global surgical-changes rule wins).

**Don't:** rewrite working code, "improve" adjacent code you didn't touch, or wait for a refactor sprint. Surgical over sweeping. (Matches the repo's refactor discipline: never bundle behavior changes into a cleanup.)

---

## 1. Names (N)

**N1 -- Descriptive.** A name that needs a comment doesn't reveal intent.
```ts
// Bad
const d = 86_400_000;
const co = sections.customOrders;
// Good
const MS_PER_DAY = 86_400_000;
const customOrders = sections.customOrders;
```

**N2 -- Right level of abstraction.** Name the concept, not the implementation.
```ts
// Bad: getArtworksAsArrayFromDb()   Good: getAllArtworks()
```

**N3 -- Standard nomenclature.** Use domain + pattern terms the codebase already uses: `getSite`, `processArtworkImage`, `useReorder`, `ContactChannel`, `maintainer`, `slug`.

**N4 -- Unambiguous.** `renameCategory(id, name)` not `rename(old, new)`.

**N5 -- Length matches scope.** Short for tiny scopes (a `.map((art, i) =>` callback, a `for` index) is fine; module-level constants get full names (`SAVED_BADGE_DURATION_MS`, not `MS`).

**N6 -- No encodings.** No Hungarian notation (`strName`, `lstUsers`), no `I`-prefixed interfaces (`IUserRepository` -> `UserRepository`). TS types make these redundant.

**N7 -- Describe side effects.** If a function does more than its name says, rename it. `getOrCreateConfig()` not `getConfig()` when it writes.

> React/TS specifics: components `PascalCase`, hooks `useX`, server actions are verbs (`createArtwork`, `setPrice`), booleans read as predicates (`isMaintainer`, `featured`, `hasSiblings`). When a local would collide with an imported symbol, disambiguate by intent (`setStatusInput` vs the imported `setStatus` action) -- not by abbreviating.

---

## 2. Functions (F)

**F1 -- Max 3 positional args.** More means it's doing too much or needs an object.
```ts
// Bad
function createUser(name, email, age, country, timezone, language, newsletter) {}
// Good -- options object (and React props objects are exempt: they're already named)
function createUser(data: NewUser) {}
```
A React component taking 8 *named* props is fine; a *function* taking 4+ *positional* args is not.

**F2 -- No output arguments.** Don't mutate inputs; return new values. (Matches React's immutable-state model -- `setItems(prev => prev.filter(...))`, never mutate `prev`.)

**F3 -- No flag arguments.** A boolean param usually means two functions.
```ts
// Bad
function render(isTest: boolean) {}
// Good
function renderTestPage() {} function renderProductionPage() {}
```
Exception: a genuinely-optional behavior toggle on a component prop (`priority?: boolean`) is idiomatic React -- judge by whether the body splits cleanly in two.

**F4 -- Delete dead functions.** Not called anywhere? Delete it. Git remembers. (Verify with a repo-wide search before deleting.)

**F5 -- One thing.** If you can extract another well-named function, it did more than one thing. Extract stateful UI logic into a **custom hook** (e.g. `useAdminAction`), not a plain function.

---

## 3. Comments (C)

**C1 -- No metadata.** No author / date / ticket numbers. Git owns history.

**C2 -- Delete obsolete comments.** A comment that contradicts the code is worse than none. (This session fixed two: `paper-grain` opacity, `types.ts` status.)

**C3 -- No redundant comments.** Don't restate code.
```ts
i += 1; // increment i   <- delete
i += 1; // skip the header row   <- keep: explains WHY
```

**C4 -- Write them well.** Brief, correct grammar, explain *why*. The repo's JSDoc blocks (the data seam, the image pipeline) are the model.

**C5 -- Never commit commented-out code.** Delete it.

> Repo note: code comments and JSDoc **may** use ` -- ` (they don't ship). User-facing strings may **not** (see section 6).

---

## 4. General quality (G)

**G5 -- DRY.** One authoritative representation per piece of knowledge. (This session: `getNextOrder`, `formString`, `useAdminAction`, `<AccentRule>`.) Read through the **data seam** -- `lib/data.ts` / `data/site.json` -- never duplicate catalog data.

**G16 -- No obscured intent.** Be clear, not clever. Name the bit-twiddle / one-liner.

**G23 -- Polymorphism over long `if/else` / `switch` chains** on a type field. A lookup map or dispatch object scales better (e.g. `ICON_FOR_KEY`, `NAV_ICON` in the footer).

**G25 -- Name magic numbers and timings.**
```ts
if (Math.abs(dx) > 50) {}                 // Bad
if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {} // Good
```
Bare `setTimeout`/threshold/slice literals get names; self-documenting named object props (`{ damping: 28 }`) do not -- naming those is over-abstraction.

**G30 -- One responsibility per function/component.**

**G36 -- Law of Demeter.** Avoid `a.b.c.d.e` train-wrecks; ask the object for what you need.

**G9 -- Remove dead code.** Unused exports/vars/imports introduced by your change. (Don't delete *pre-existing* dead code unless asked.)

**Enforcement checklist:** no duplication (G5) · clear intent, named constants (G16/G25) · dispatch over long conditionals (G23) · one thing (G30) · no train-wrecks (G36) · edge cases handled · dead code removed.

---

## 5. Tests (T)

This repo currently has **no automated test suite**; the regression net is `pnpm typecheck` + `pnpm lint` + `pnpm build`. Always run all three after changes; never claim "done" on types/lint alone. If/when tests are added, use the repo's framework (Playwright is the installed dep) -- never introduce a new one. Then:

- **T1/T5 -- Cover what can break + boundaries.** Empty input, off-by-one, page zero, sold-out artwork, missing palette.
- **T-FIRST -- Fast, Independent, Repeatable, Self-validating, Timely.**
- **One concept per test;** name it as the behavior (`test_user_can_be_activated`).
- **No skipped tests** without a documented reason. An ignored test is an unanswered question.
- **Found a bug? Test all sibling cases** -- bugs cluster.
- **Hard to test = doing too much.** Refactor for testability.

---

## 6. kalchar house rules (project-specific, override generic advice)

These come from the repo `CLAUDE.md` + `MEMORY.md` and are part of "clean" here:

- **No literal ` -- ` in user-facing copy.** JSX text, metadata title/description, dropdown options, `data/*.json` string values. Use comma / period / colon / parens. (Code comments + JSDoc are exempt.)
- **No emojis** in user-facing copy or commits unless asked.
- **Voice:** neutral first-person plural ("we'll get back to you"). Exception: `data/site.json` artist-voice copy.
- **No raw hex/rgb/hsl in components.** Color via CSS custom properties (`bg-(--section-accent)`, `var(--color-ruby)`). Exceptions: `data/artworks.json` palette arrays (data) and SVG data URIs (vars don't resolve there); browser-chrome theme-color metadata (emitted pre-CSS) is named with a sync note.
- **No magic timings.** Use named CSS tokens (`--duration-fast/base/slow`, `--ease-out/in-out/spring`) in className; for JS-side Motion configs use named constants (CSS vars can't reach JS).
- **`rounded-md` everywhere**, pills/toggle `rounded-full`. No sharp corners.
- **500-line file ceiling.** Split before committing (extract sub-component, lift styles, pull data into JSON).
- **Architecture seams:** catalog reads go through `lib/data.ts`; images through `lib/image-base.ts`; admin mutations are server actions in `app/admin/actions.ts` that re-check `isMaintainer`; URLs from `lib/site-config.ts`. Don't bypass these.
- **Accessibility:** prefer native elements over ARIA roles (`<ul>/<li>` not `role="list"`); respect `prefers-reduced-motion`.
- **GitHub Actions:** least-privilege `permissions` (default `contents: read`, grant per job).

---

## 7. Workflow when applying this skill

1. **Establish a green baseline** (`typecheck`, `lint`, `build`) before editing a test-less codebase.
2. Make **one surgical change at a time**; keep cleanup proportional to the task.
3. **Never bundle a behavior change into a refactor** -- if a "cleanup" would alter runtime behavior, stop and call it out separately.
4. **Re-verify green** (`typecheck` + `lint` + `build`) after each batch; commit per logical batch with a conventional message.
5. For real findings you choose **not** to fix (intentional design), say so explicitly with the reason -- don't silently skip.
