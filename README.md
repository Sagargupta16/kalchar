# Kalchar by Megha

Portfolio site for Megha Seth, traditional folk artist working in Madhubani, Pichwai, Lippan, Gond and texture art.

**Live:** <https://kalchar.co.in/>

## Stack

Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind 4 + Biome 2. Motion 12 + Lenis for animation. pnpm 10, Node 22.

Runs as a dynamic Next app on **Vercel**: public pages are static/SSG, the `/admin` panel + auth are server-rendered. Catalog data lives in **Neon Postgres** (read through one seam, `lib/data.ts`); artwork images live in **Cloudflare R2**; admin login is **Auth.js + Google**, gated to a maintainer allowlist in the DB. Full picture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/architecture-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/diagrams/architecture-light.svg">
  <img width="880" src="docs/diagrams/architecture-light.svg" alt="Kalchar architecture. A visitor's browser reaches the Vercel edge at kalchar.co.in, which serves the public pages of the Next.js 16 app and proxies /media image requests to Cloudflare R2. Public pages are static and SSG, read from Neon Postgres through lib/data.ts at build time and when content changes, and the custom-order form's lead action saves briefs to Neon. Buying and commissions hand off to WhatsApp through a wa.me link. A maintainer's /admin requests pass proxy.ts, which checks the Auth.js session; Auth.js signs in with Google OAuth and checks the maintainer allowlist in Neon. Admin server actions read and write Neon and store sharp image variants in R2, while the maintainer's browser uploads originals straight to R2 staging with a presigned PUT. Daily GitHub Actions crons run a production health check against the site and delete expired R2 staging uploads.">
</picture>

The spec behind the picture is [`docs/diagrams/architecture.yaml`](docs/diagrams/architecture.yaml), rendered with [orrery](https://github.com/Sagargupta16/orrery).

## Local dev

```sh
pnpm install
pnpm dev          # http://localhost:3000  (needs .env.local -- see .env.example)
pnpm dev --port 3001  # alternate port; Google OAuth must allow the matching callback
pnpm build        # next build
pnpm typecheck
pnpm exec tsc -p tsconfig.scripts.json
pnpm lint
pnpm test         # unit tests
pnpm test:e2e     # production browser + accessibility checks on port 3001
pnpm format
```

Database + image helpers:

```sh
node scripts/check-migrations.mjs  # verify journal, SQL, and snapshots offline
pnpm db:migrate   # apply the reviewed migration history to the selected database
pnpm db:seed      # one-time bootstrap; refuses any populated catalog/settings
pnpm db:images    # upload public/artworks/ image variants to R2
```

Use an isolated database and bucket for development. Follow [first-time setup](docs/DEVELOPMENT.md) before running write commands. Existing databases created with `db:push` need the [verified baseline procedure](docs/DATABASE.md#existing-database-created-with-dbpush), not a replay of already-present schema changes.

CI uses public fixtures without production credentials and checks migration application against disposable PostgreSQL separately. The [operations runbook](docs/OPERATIONS.md) covers coordinated database/image recovery and explicitly distinguishes offline verification from provider restore drills.

## What's on disk

| Path | Purpose |
| --- | --- |
| [`app/`](app/) | Routes: home single-pager, `/work` + `/work/[slug]` (Artwork gallery + buy filter), `/events`, about / workshops / custom-orders / contact, `/admin` (artworks, events, profile, maintainers, more), `/api/auth`, sitemap. |
| [`components/`](components/) | `home/` teasers, `gallery/`, `events/`, `about/`, `layout/`, `motion/`, `decor/`, `ui/`, `forms/`. |
| [`lib/`](lib/) | `data.ts` (the seam), `db/` (Drizzle schema + client), `storage/` (R2 + image processing), `maintainers.ts`, `image-base.ts`, `types.ts`, `whatsapp.ts`, `site-config.ts`, hooks. |
| [`auth.ts`](auth.ts), [`proxy.ts`](proxy.ts) | Auth.js config + `/admin` route protection (`proxy.ts` is the Next 16 rename of `middleware.ts`). |
| [`data/`](data/) | `site.json` (brand/nav/copy, read at runtime) + `artworks.json` (original seed source). |
| [`public/`](public/) | Master artwork JPGs (R2 regenerate source and final fallback), logo, `robots.txt`. |
| [`scripts/`](scripts/) | Guarded bootstrap, migration and baseline checks, offline backup verification, image helpers, and public catalog/media health checks. |
| [`docs/`](docs/) | Engineering docs: [ARCHITECTURE](docs/ARCHITECTURE.md), [DATABASE](docs/DATABASE.md), [AUTH](docs/AUTH.md), [IMAGES](docs/IMAGES.md), [DEPLOYMENT](docs/DEPLOYMENT.md), [DEVELOPMENT](docs/DEVELOPMENT.md), [OPERATIONS](docs/OPERATIONS.md), [ADDING-FEATURES](docs/ADDING-FEATURES.md), plus [`diagrams/`](docs/diagrams/) (the orrery spec and SVGs for the picture above). Index: [docs/README.md](docs/README.md). |
| [`.github/workflows/`](.github/workflows/) | `ci.yml` verifies code, migrations, secrets, build, and browsers. `health.yml` checks production daily. `deploy.yml` is the manual Pages recovery path. |

## Deploy

`main` -> Vercel production -> <https://kalchar.co.in/>. `dev` -> Vercel preview. Full details (branches, CI, env matrix, DNS): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## License

Proprietary. All artwork rights belong to Megha Seth. Code is not licensed for reuse. See [`LICENSE`](LICENSE).
