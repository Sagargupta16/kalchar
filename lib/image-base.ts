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

/** R2 public origin. Event images store their full key-base, so they prefix
 * with the bare origin (the "events/..." path is part of the stored key). */
export const IMAGE_ORIGIN = r2Base;

/**
 * Width tiers emitted by the sharp pipeline -- the single source of truth.
 * The pipeline that writes the variants (lib/storage/process-artwork-image.ts)
 * and every consumer that reads them (ResponsiveImage srcset, this preload
 * hint) import this, so the set is changed in exactly one place.
 */
export const VARIANT_WIDTHS = [400, 800, 1200, 1600] as const;

/**
 * Build an AVIF srcset string for an artwork slug, for use in a
 * `<link rel="preload" as="image">` hint. Preloading the LCP artwork (home
 * hero, detail plate) starts the fetch at HTML parse instead of after the
 * browser discovers the <picture>, which is the dominant lever on image-LCP
 * pages. AVIF only -- it's what every target browser (iOS 16+, Chrome) picks,
 * and a preload can only advertise one type.
 *
 * `maxWidth` caps the offered tiers so the preload resolves to the same
 * variant the (capped) <img> picks -- otherwise the browser preloads 1200w but
 * the <img> loads 800w, double-fetching. Keep it in lockstep with the
 * ArtImage `maxWidth` on the same element.
 */
export function artworkPreloadSrcset(image: string, maxWidth?: number): string {
	const slug = image.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
	return VARIANT_WIDTHS.filter((w) => !maxWidth || w <= maxWidth)
		.map((w) => `${ARTWORK_IMAGE_BASE}/${slug}-${w}.avif ${w}w`)
		.join(", ");
}
