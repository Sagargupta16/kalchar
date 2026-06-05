/**
 * Where artwork image variants are served from.
 *
 * Phase 1 (and the static fallback): variants live under `/_opt/artworks/`,
 * generated locally by scripts/optimize-images.mjs and shipped with the build.
 *
 * Phase 2: when R2_PUBLIC_BASE_URL is set, variants are served from the R2
 * bucket instead (same filenames, same `artworks/<slug>-<width>.<ext>` layout).
 * The migration script (scripts/migrate-images-to-r2.ts) uploads the existing
 * `_opt/` variants under the `artworks/` prefix so the paths line up 1:1.
 *
 * So the only thing that changes between phases is the base URL. Both the
 * <picture> srcset (art-image.tsx), the lightbox, and OG metadata read it here.
 *
 * NEXT_PUBLIC_ prefix: this value must be readable in client components
 * (art-image is "use client"), so it ships to the browser. It's a public URL,
 * not a secret. Set NEXT_PUBLIC_IMAGE_BASE_URL in the deploy env (Vercel); the
 * R2_PUBLIC_BASE_URL in .env.local is mirrored to it for local dev below.
 */

// Local dev reads R2_PUBLIC_BASE_URL (server-side .env.local); production reads
// the NEXT_PUBLIC_ copy baked at build time. Either resolves to the R2 origin,
// or "" to fall back to the local /_opt path.
const r2Base = (
	process.env.NEXT_PUBLIC_IMAGE_BASE_URL ??
	process.env.R2_PUBLIC_BASE_URL ??
	""
).replace(/\/$/, "");

/** Base path for artwork variants. R2 origin + "/artworks" when configured, else "/_opt/artworks". */
export const ARTWORK_IMAGE_BASE = r2Base ? `${r2Base}/artworks` : "/_opt/artworks";
