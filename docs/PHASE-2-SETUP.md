# Phase 2 setup — kickoff checklist

_Created: 2026-06-04_
_Decisions locked: **Vercel** hosting · **Neon Postgres + Drizzle** DB · **Cloudflare R2** image storage · **Auth.js v5 + Google** · admins = **Sagar + Megha**._

This is the actionable runbook for Phase 2 (admin panel: Google login, image upload, edit metadata / price / availability). It complements the strategy in [ROADMAP.md](../ROADMAP.md) Track B. Auth.js and Drizzle/Neon specifics below were verified against current official docs on 2026-06-04. **DB note:** Neon (Postgres) chosen over Turso to match the ledger-sync app, so one Neon + Vercel integration serves both repos and Phase 3 relational needs (orders/bookings) are covered.

> **Hard constraint — read first.** The live site is a GitHub Pages **static export** (`output: "export"`). A static export **cannot** contain `app/api/*` route handlers or dynamic routes — `next build` fails the moment they exist. Therefore Phase 2 **cannot ship on `main`**. It lives on a branch that drops the export and deploys to **Vercel**, while `main` keeps serving the static site on Pages as the permanent fallback. DNS for `kalchar.co.in` only moves at a deliberate cutover (ROADMAP C4); rollback = repoint DNS to Pages.

---

## Part 1 — Credentials to create (only Sagar can do these)

Do these **in order**. Code scaffolding (Part 3) is blocked until the env vars exist, because nothing is verifiable without real services. Collect everything into `.env.local` (gitignored — never commit it).

### 1. Neon Postgres database

> **Account decided:** Neon can stay on the **same account** as ledger-sync — a separate Neon project (`kalchar`) is free and isolated, no second account needed (capacity is a non-issue at ~0.6 KB/row). Composio can create this project + fetch `DATABASE_URL` programmatically (`NEON_CREATE_PROJECT_WITH_QUOTA_AND_SETTINGS` → `NEON_GET_PROJECT_CONNECTION_URI`); it needs `org_id` from `NEON_GET_USER_ORGANIZATIONS` first.

Easiest path: add it through Vercel (step 5) — Vercel → Storage → create a Neon Postgres DB, and `DATABASE_URL` is injected into the project automatically. Or directly:

1. [Neon console](https://console.neon.tech/) → New Project (region near your users, e.g. `ap-southeast-1`).
2. Create a database named `kalchar`.
3. Connection Details → copy the **pooled** connection string → use as `DATABASE_URL` (includes `-pooler` in the host and `?sslmode=require`).

### 2. Cloudflare R2 (image storage)

1. Cloudflare dashboard → R2 → create bucket `kalchar-artworks`.
2. R2 → Manage API Tokens → create token (Object Read & Write, scoped to the bucket).
3. Copy: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=kalchar-artworks`.
4. Enable a public access URL (R2 public bucket or a custom domain like `img.kalchar.co.in`) → copy as `R2_PUBLIC_BASE_URL`. (R2 has no egress fees — this is why R2 over S3.)

### 3. Google OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. APIs & Services → OAuth consent screen → External → add **both admin emails** (Sagar + Megha) as test users (or publish the app).
3. Credentials → Create Credentials → OAuth client ID → **Web application**.
4. Authorized redirect URIs — add all of:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-preview>.vercel.app/api/auth/callback/google` (Vercel preview, add once known)
   - `https://kalchar.co.in/api/auth/callback/google` (only after cutover)
5. Copy: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.

### 4. Auth.js secret

- Run `npx auth secret` (writes `AUTH_SECRET` to `.env.local`), or `openssl rand -base64 33`.

### 5. Vercel project (when ready to deploy the branch)

> **Account decided:** use the dedicated **`sagar-2`** Vercel account (`sg20001016@gmail.com`, Hobby plan, currently 0 projects) — NOT the personal account that hosts ledger-sync. Reasons: kalchar takes buy-intent (commercial-ish, and Hobby is non-commercial-only on the shared account), clean ownership separation, and isolated bandwidth/build quota. This account is connected in Composio (`vercel_ignore-owk`), so project creation + env + deploy can be driven programmatically once the code is deploy-ready.

1. Import the GitHub repo into the `sagar-2` Vercel account, set the production branch to the Phase 2 branch (NOT `main`).
2. Paste every env var below into Vercel → Project → Settings → Environment Variables.
3. Vercel auto-detects Next.js; no custom build command needed once `output: "export"` is removed on that branch.

### Env var manifest (`.env.local` + Vercel)

```
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=sagar@example.com,megha@example.com   # comma-separated allowlist
DATABASE_URL=                                       # Neon pooled connection string
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=kalchar-artworks
R2_PUBLIC_BASE_URL=
```

`.env.example` (committed, values blank) should mirror these keys so the next session knows the contract.

---

## Part 2 — Packages (already installed on `feat/phase-2-backend`)

```sh
pnpm add next-auth@beta drizzle-orm @neondatabase/serverless @aws-sdk/client-s3
pnpm add -D drizzle-kit tsx dotenv
```

(`next-auth@beta` is Auth.js v5. `@neondatabase/serverless` is the Neon Postgres driver. R2 speaks the S3 API, so the AWS S3 SDK is the R2 client.)

---

## Part 3 — Code scaffold

Status key: **[done]** = already on `feat/phase-2-backend` (compiles, unwired, Phase 1 build unaffected). **[todo]** = needs live credentials to build + verify, so not scaffolded blind.

| File | Status | Purpose |
| --- | --- | --- |
| `lib/db/schema.ts` | **[done]** | Drizzle `pgTable` for `artworks` + `workshops`, mirroring the `data/*.json` shape; `palette` is native `jsonb`. |
| `lib/db/client.ts` | **[done]** | `drizzle({ client: neon(DATABASE_URL) })` via the neon-http driver. |
| `drizzle.config.ts` | **[done]** | `dialect: 'postgresql'`, schema + `DATABASE_URL`. |
| `lib/storage/r2.ts` | **[done]** | S3-SDK client pointed at R2; `uploadObject()` returns the public URL. |
| `auth.ts` (root) | **[done]** | `NextAuth({ providers: [Google], callbacks })`; the `signIn` callback rejects any email not in `ADMIN_EMAILS`. Exports `handlers, signIn, signOut, auth`. |
| `scripts/migrate-json-to-db.ts` | **[done]** | One-shot `pnpm db:seed`: idempotent `data/*.json` → DB rows. |
| `.env.example` | **[done]** | Committed key contract (blank values). |
| `next.config.mjs` edit | **[todo]** | **Remove `output: "export"`** on this branch so it builds dynamic. **This is the cutover off static.** |
| `app/api/auth/[...nextauth]/route.ts` | **[todo]** | `export const { GET, POST } = handlers`. |
| `middleware.ts` | **[todo]** | `export { auth as middleware }` + matcher protecting `/admin/*`. (Next 16 renames this to `proxy.ts`; we're on 15.5.x → `middleware.ts`.) |
| `lib/data.ts` | **[todo]** | **Swap the seam body** from JSON reads to Drizzle queries. **Becomes async** — callers (page components) become `async` server components. Largest change. |
| `lib/storage/r2.ts` variant gen | **[todo]** | Add `sharp` on upload to emit `_opt`-style AVIF/WebP/JPG widths under the same key prefix. |
| `app/admin/page.tsx` | **[todo]** | Admin dashboard (list, reorder, toggle availability, set price). |
| `app/admin/upload/page.tsx` | **[todo]** | Upload form → server action → R2 + DB insert. |
| `app/api/admin/*` or server actions | **[todo]** | CRUD mutations, all behind the `auth()` gate. |

**Order of build (each step verifiable):**

1. `pnpm db:push` → tables created in Neon. `pnpm db:seed` → confirm 21 rows land. (No UI change yet; static export still works because nothing imports the DB.)
2. Drop `output: "export"`; rewrite `lib/data.ts` async; make page components async → `pnpm build` + run app, gallery still renders (now from Neon). **This is the cutover point off static.**
3. Auth.js route handler + middleware → sign in with both Google accounts, confirm non-allowlisted emails are rejected.
4. `/admin` pages + upload + CRUD + R2 variant gen → upload a test piece end-to-end, see it appear in the gallery.
5. Deploy branch to Vercel preview, repeat 3-4 against the preview URL.
6. ROADMAP C4 cutover when satisfied.

---

## What stays untouched

- `main` and [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — the Pages deploy keeps running as fallback.
- `public/CNAME` — stays in the repo for instant DNS rollback.
- The `<picture>`/srcset contract in [art-image.tsx](../components/gallery/art-image.tsx) — only the image URL base changes (local `_opt/` → R2 public URL).

---

## Capacity — will the free tiers hold the catalog?

Yes, by a wide margin. Measured against the real catalog + current free-tier limits (verified 2026-06-04).

### Footprint per artwork

| Item | Size |
| --- | --- |
| Raw master JPG | ~1.29 MB avg (21 masters = 28 MB) |
| Optimized variants (`_opt/`: AVIF/WebP/JPG × 4 widths + fallback = 13 files) | ~1.8 MB |
| **Total stored on R2 per piece** (master + variants) | **~3.1 MB** |
| DB row (metadata + palette JSON) | ~0.6 KB |

### Free-tier limits and headroom

| Service | Free tier | What it means here |
| --- | --- | --- |
| **Cloudflare R2** (images) | 10 GB storage · 1M writes/mo · 10M reads/mo · **egress free** | **The only real constraint.** At ~3.1 MB/piece → **~3,000 artworks** free. Variants-only (drop master, ~1.8 MB) → ~5,600. Uploads are ~13 Class-A ops/piece; you'd upload ~75k pieces/mo to hit the write cap. |
| **Neon** (metadata DB) | 0.5 GB storage · ample compute hours on the free plan | Effectively infinite for this catalog. 0.6 KB rows → 0.5 GB holds **~800k artworks**. Matches the ledger-sync DB provider, so one Neon account covers both apps. |
| **Vercel** (hosting) | 100 GB bandwidth/mo (Hobby) | Not image-bound (images come from R2). At ~160 KB/page → **~650k page loads/mo**. |

### Verdict

- **Binding limit: R2 storage at ~3,000 pieces.** A working artist makes ~20-50 pieces/year, so the free 10 GB is **60+ years** of output. Megha will not reach a paid tier.
- **R2's free egress** is why the runbook chose it over S3: serving an image-heavy public gallery costs nothing regardless of traffic, whereas S3 bills per GB served.
- **No over-engineering needed** at this scale: no CDN tiering, no image-CDN service, no lifecycle rules. Upload master + variants to R2, serve directly.
- **Decision: keep the masters on R2** (~3.1 MB/piece). Storage is free either way, and keeping masters lets variants be regenerated later if widths/formats change, without a re-shoot.

---

## Next action

When you've created the four services (Part 1) and have the env vars, say so and point me at this file — I'll scaffold Part 3 on a dedicated `feat/phase-2-backend` branch and walk each verifiable step. Until then, nothing backend ships, and the live site is unaffected.
