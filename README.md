# folk-art-portfolio

Portfolio site for **Megha Seth** -- folk artist working in Madhubani, Pichwai, Lippan, Gond and texture art, plus a regular workshop practice.

**Live:** <https://kalchar.co.in/>

Currently rebuilding the frontend from scratch on `feat/ui-theme-foundation`. Catalog data and build pipeline are kept; UI is being redesigned.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite 6, static output to `dist/` |
| UI | React 19 + TypeScript 6 (strict) |
| Styling | Tailwind 4 via `@tailwindcss/vite` |
| Fonts | Self-hosted Cormorant Garamond, Inter, Tiro Devanagari Hindi |
| Content | JSON in `src/data/` |
| Images | Build-time `sharp` -> AVIF + WebP at 400/800/1200 widths |
| SEO | Build-time Vite plugin injects OG/Twitter/canonical/JSON-LD into `index.html` and writes `dist/sitemap.xml` |
| Lint / format | Biome 2 |
| Deploy | GitHub Pages via Actions, OIDC auth |

## Run

```sh
pnpm install
pnpm dev          # http://localhost:5173/
pnpm build        # static build to ./dist
pnpm preview      # serve the built site
pnpm typecheck    # tsc -b
pnpm lint         # biome check
pnpm format       # biome format --write
```

Requires Node 20.18+ and pnpm 10.

## Content

All display copy lives in two JSON files; editing them updates the site:

- [`src/data/site.json`](src/data/site.json) -- brand, nav, contact, every section's copy, the workshops list.
- [`src/data/artworks.json`](src/data/artworks.json) -- the artwork catalog. One entry per piece.

Adding a new artwork:

1. Drop the image at `public/artworks/<slug>.jpg`.
2. Append an entry to `src/data/artworks.json` with `image: "<slug>.jpg"`.
3. `pnpm build` regenerates AVIF + WebP variants automatically.

## Deploy

`main` -> <https://kalchar.co.in/> via GitHub Pages. `public/CNAME` ships the apex domain.

## License

Proprietary. All artwork rights belong to Megha Seth. Code is not licensed for reuse. See [`LICENSE`](LICENSE).
