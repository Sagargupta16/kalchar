# Phase 2 setup — kickoff checklist

_Created: 2026-06-04_
_Decisions locked: **Vercel** hosting · **Turso + Drizzle** DB · **Cloudflare R2** image storage · **Auth.js v5 + Google** · admins = **Sagar + Megha**._

This is the actionable runbook for Phase 2 (admin panel: Google login, image upload, edit metadata / price / availability). It complements the strategy in [ROADMAP.md](../ROADMAP.md) Track B. Auth.js and Drizzle/Turso specifics below were verified against current official docs on 2026-06-04.

> **Hard constraint — read first.** The live site is a GitHub Pages **static export** (`output: "export"`). A static export **cannot** contain `app/api/*` route handlers or dynamic routes — `next build` fails the moment they exist. Therefore Phase 2 **cannot ship on `main`**. It lives on a branch that drops the export and deploys to **Vercel**, while `main` keeps serving the static site on Pages as the permanent fallback. DNS for `kalchar.co.in` only moves at a deliberate cutover (ROADMAP C4); rollback = repoint DNS to Pages.

---

## Part 1 — Credentials to create (only Sagar can do these)

Do these **in order**. Code scaffolding (Part 3) is blocked until the env vars exist, because nothing is verifiable without real services. Collect everything into `.env.local` (gitignored — never commit it).

### 1. Turso database

1. Install CLI: `curl -sSfL https://tur.so/install.sh | bash` (or `brew install tursodatabase/tap/turso`).
2. `turso auth signup` (GitHub login).
3. `turso db create kalchar` — creates the DB.
4. `turso db show kalchar --url` → copy as `TURSO_DATABASE_URL` (the `libsql://...` value).
5. `turso db tokens create kalchar` → copy as `TURSO_AUTH_TOKEN`.

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

1. Import the GitHub repo into Vercel, set the production branch to the Phase 2 branch (NOT `main`).
2. Paste every env var below into Vercel → Project → Settings → Environment Variables.
3. Vercel auto-detects Next.js; no custom build command needed once `output: "export"` is removed on that branch.

### Env var manifest (`.env.local` + Vercel)

```
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=sagar@example.com,megha@example.com   # comma-separated allowlist
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=kalchar-artworks
R2_PUBLIC_BASE_URL=
```

`.env.example` (committed, values blank) should mirror these keys so the next session knows the contract.

---

## Part 2 — Packages to add

```sh
pnpm add next-auth@beta drizzle-orm @libsql/client @aws-sdk/client-s3
pnpm add -D drizzle-kit tsx
```

(`next-auth@beta` is Auth.js v5. R2 speaks the S3 API, so the AWS S3 SDK is the R2 client.)

---

## Part 3 — Code scaffold (files to create, once creds exist)

| File | Purpose |
| --- | --- |
| `next.config.phase2.mjs` or branch edit | **Remove `output: "export"`**; keep everything else. This branch builds dynamic. |
| `auth.ts` (root) | `NextAuth({ providers: [Google], callbacks })` — the `signIn` callback rejects any email not in `ADMIN_EMAILS`. Exports `handlers, signIn, signOut, auth`. |
| `app/api/auth/[...nextauth]/route.ts` | `export const { GET, POST } = handlers`. |
| `middleware.ts` | `export { auth as middleware }` + matcher protecting `/admin/*`. (Next 16 renames this to `proxy.ts`; we're on 15.5.x → `middleware.ts`.) |
| `lib/db/schema.ts` | Drizzle `sqliteTable` for `artworks` (mirrors the current `data/artworks.json` shape: slug, title, style, medium, dimensions, year, priceInr, status, order, palette JSON, image key, description). |
| `lib/db/client.ts` | `drizzle({ connection: { url, authToken } })` from Turso env. |
| `drizzle.config.ts` | `dialect: 'turso'`, schema + dbCredentials. |
| `lib/data.ts` | **Swap the seam body** from JSON reads to Drizzle queries. **Becomes async** — callers (page components) become `async` server components. This is the largest change. |
| `lib/storage/r2.ts` | S3-SDK client pointed at R2; `uploadArtwork()` puts the master + (optionally) runs sharp to emit `_opt`-style variants, returns the public URL base. |
| `app/admin/page.tsx` | Admin dashboard (list, reorder, toggle availability, set price). |
| `app/admin/upload/page.tsx` | Upload form → server action → R2 + DB insert. |
| `app/api/admin/*` or server actions | CRUD mutations, all behind the `auth()` gate. |
| `scripts/migrate-json-to-db.mjs` | One-shot: read `data/artworks.json` → insert rows → upload existing `public/artworks/*` to R2. Run once, then retire `/data`. |
| `.env.example` | Committed key contract (blank values). |

**Order of build (each step verifiable):**

1. DB layer + schema + `drizzle-kit push` → verify with a read script. (No UI change yet; static export still works because no route handlers exist.)
2. Migration script → confirm rows + images land in Turso/R2.
3. Drop `output: "export"`; rewrite `lib/data.ts` async; make page components async → `pnpm build` + run app, gallery still renders (now from DB). **This is the cutover point off static.**
4. Auth.js + middleware → sign in with both Google accounts, confirm non-allowlisted emails are rejected.
5. `/admin` pages + upload + CRUD → upload a test piece end-to-end, see it appear in the gallery.
6. Deploy branch to Vercel preview, repeat 4-5 against the preview URL.
7. ROADMAP C4 cutover when satisfied.

---

## What stays untouched

- `main` and [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — the Pages deploy keeps running as fallback.
- `public/CNAME` — stays in the repo for instant DNS rollback.
- The `<picture>`/srcset contract in [art-image.tsx](../components/gallery/art-image.tsx) — only the image URL base changes (local `_opt/` → R2 public URL).

---

## Next action

When you've created the four services (Part 1) and have the env vars, say so and point me at this file — I'll scaffold Part 3 on a dedicated `feat/phase-2-backend` branch and walk each verifiable step. Until then, nothing backend ships, and the live site is unaffected.
