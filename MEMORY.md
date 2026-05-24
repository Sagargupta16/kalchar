# Memory

Last updated: 2026-05-24

Repo-level memory for `folk-art-portfolio` (renamed from `megha-art-portfolio` 2026-05-17). Stacks under workspace-root [MEMORY.md](../../MEMORY.md). Claude reads this at session start. No PII -- contact details, payment terms, and anything sensitive stay out of the repo.

---

## Client

- Megha Seth, traditional artist. Public-facing identity.
- Non-technical: does not write code, does not use git, does not run a dev server.
- Update flow: client never edits the repo directly. Sagar edits and ships. JSON-driven content (`src/data/site.json`, `src/data/artworks.json`) is CMS-ready if she ever wants self-edit later.

---

## Locked decisions

| Topic | Decision | Date | Rationale |
| --- | --- | --- | --- |
| Stack | Vite 6 + React 19 (SPA) + TypeScript 6 + Tailwind 4 | 2026-05-22 | Migrated from Astro 6 (see CHANGELOG 1.4.0). Single rendering layer, zero `.astro` files. SEO injected at build time via a Vite plugin so the static HTML carries OG / JSON-LD / canonical / sitemap. |
| Hosting | GitHub Pages (`Sagargupta16/folk-art-portfolio`, public) | 2026-05-17 | Free, fast, custom-domain-ready. Served from the apex `kalchar.co.in` via `public/CNAME`. |
| Custom domain | `kalchar.co.in` (apex). DNS at registrar: 4 A records to GitHub Pages IPs + `www` CNAME -> `sagargupta16.github.io`. | 2026-05-24 | Client-owned domain. Single source of truth for URLs is [`scripts/site-config.mjs`](scripts/site-config.mjs) -- `SITE` + `BASE`. Canonical / OG / sitemap / JSON-LD all derive from there. |
| Content model | JSON-driven (`src/data/site.json`, `src/data/artworks.json`) imported via `resolveJsonModule`, typed in `src/lib/`. | 2026-05-22 | Single source of truth for display data. Same files survive the Astro -> Vite migration; the SEO plugin and sitemap generator both read `artworks.json` directly. |
| Edit flow | Sagar edits and ships. No CMS. | 2026-05-17 | Client is non-technical; volume is low. |
| Image rights | Cleared by client. Higher-resolution originals to follow when available. | 2026-05-17 | Confirmed verbally with client. |
| Versioning | Manual SemVer, pre-1.0.0 during build-out. See `CLAUDE.md` -> Branching and releases. | 2026-05-17 | Site has no consumers; auto-tooling not worth the config cost. |
| Theme | Light + dark modes, warm off-white / charcoal, terracotta accent. Tokens in `src/styles/globals.css`. | 2026-05-17 | Madhubani palette is saturated; warm neutrals support it better than pure black/white. |
| Branding accent | Devanagari character `म` as decorative accent in hero. | 2026-05-17 | Honors the tradition without making the whole site bilingual. |
| Single-env deploy | `main` -> `kalchar.co.in` (prod). `dev` is local-only -- `pnpm preview` for staging. | 2026-05-24 | GH Pages allows one custom domain per repo, so a public `/beta/` URL isn't possible without a second repo. Local preview is enough for solo iteration; prod stays clean. |
| Branch protection | `main` is PR-only, CI required. `dev` unprotected (solo workflow, fast iteration). | 2026-05-22 | Prevents accidental direct pushes to prod; dev stays nimble. |
| Lint / format | Biome 2 (single tool, no ESLint/Prettier split). Config at repo root in `biome.json`. | 2026-05-22 | One binary, one config. CI runs `pnpm lint` alongside typecheck and build. |

---

## Pending decisions

Single source of truth lives in the new-artwork skill's "To-do before unstubbing" checklist: [.claude/skills/new-artwork/SKILL.md](.claude/skills/new-artwork/SKILL.md). Don't duplicate that list here.

Nothing open beyond the skill checklist.

---

## Content inventory

Snapshot of what's live on the site. Updated by the `new-artwork` skill on every add.

- Catalog (single source of truth): [src/data/artworks.json](src/data/artworks.json) -- count, titles, slugs, styles all live there.
- Local images: [public/artworks/](public/artworks/) -- one `<slug>.jpg` per piece. The build's `sharp` script generates AVIF + WebP variants automatically.
- Updated by: new-artwork skill (or by hand when adding via the JSON catalog).
