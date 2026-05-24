# MEMORY.md

Repo-specific facts that should persist across Claude sessions. Stacks on the workspace root [MEMORY.md](../../MEMORY.md). Read at session start.

Never put PII here. Contact details, payment terms, anything sensitive stays out.

## What this project is

Portfolio site for **Megha Seth**, traditional folk artist. Live at <https://kalchar.co.in/>.

## Long-term vision (user-stated)

Eventually a **full-stack site**:

- **Public**: archive of all past artworks, view currently-available pieces with prices, submit custom-order requests.
- **Admin**: Google OAuth login -> upload images, edit existing artworks, rearrange display order, manage availability + prices, read incoming orders.

Today: catalog in repo (`data/*.json`), static deploy. Focus is on **better public UI**.

**Structural principle**: pick folder/file structure now so the future full-stack switch is local, not a rewrite. Treat data reads as one seam, keep routes clean, keep config (URLs, base path) in one place.

## Current state

| Field | Value |
| --- | --- |
| Branch | `feat/ui-theme-foundation` (ahead of `main`, not pushed) |
| Build pipeline | Removed -- no `package.json`, no Vite, no TS config, no `src/` |
| Catalog | Kept at `data/site.json` and `data/artworks.json` |
| Images | Kept at `public/artworks/` (28 MB, ~23 pieces) |
| Deploy | GitHub Pages OIDC from `main` (workflow exists, will fail until v3 scaffolds) |

Earlier branch commits contain prior frontend attempts that were wiped. Do not mine them for design choices without explicit user confirmation.

## Decisions locked

| Decision | Value |
| --- | --- |
| Domain | `kalchar.co.in` (apex, client-owned). `public/CNAME` ships it. |
| Hosting | GitHub Pages, OIDC deploy from `main` |
| Default branch | `main` |

## Decisions open

Nothing locked yet for the v3 rebuild. Stack pick, page structure, data seam location, UI direction, motion approach -- all pending the user's discovery.

## Roles

- **Megha Seth** -- the artist. Owns all artwork rights. Does not write code.
- **Sagar Gupta** -- developer. Sole maintainer.

## Operating posture

The user drives discovery. Don't ask questions until invited. Don't propose options unprompted. Don't carry over preferences, rules, or patterns from prior sessions in this repo -- everything is open until the user states it.
