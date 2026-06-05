/**
 * Where artwork image variants are served from.
 *
 * Images live in Cloudflare R2 under `artworks/<slug>-<width>.<ext>` (AVIF /
 * WebP / JPG at 400/800/1200/1600 + a master-width JPG). The admin upload flow
 * (lib/storage/process-artwork-image.ts) writes them; the public gallery reads
 * them from the bucket's public URL.
 *
 * NEXT_PUBLIC_ prefix: art-image.tsx is a client component, so this value must
 * ship to the browser. It's a public URL, not a secret. Set
 * NEXT_PUBLIC_IMAGE_BASE_URL in every environment (Vercel prod + preview, CI,
 * and local .env.local). R2_PUBLIC_BASE_URL is the server-side fallback for
 * local scripts that don't load the NEXT_PUBLIC_ copy.
 */
const r2Base = (
	process.env.NEXT_PUBLIC_IMAGE_BASE_URL ??
	process.env.R2_PUBLIC_BASE_URL ??
	""
).replace(/\/$/, "");

/** Base URL for artwork variants: the R2 public origin + "/artworks". */
export const ARTWORK_IMAGE_BASE = `${r2Base}/artworks`;
