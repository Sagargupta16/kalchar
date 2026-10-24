/**
 * Pure R2 key rules shared by the image writer and checked against the
 * same-origin `/media` rewrite in next.config.mjs. No sharp or R2 imports, so
 * the route tests can load it directly.
 */

/** Key segment for a title with no ASCII letters or digits, such as an all-Devanagari title. */
export const FALLBACK_KEY_SEGMENT = "piece";

const KEY_SEGMENT_MAX_LENGTH = 64;

/**
 * ASCII-only R2 key segment for an artwork slug.
 *
 * Slugs keep Unicode letters so a Devanagari title still has a readable URL,
 * but the `/media` rewrite only proxies `[A-Za-z0-9_-]` filenames, so a key
 * built from such a slug 404s every variant. NFKD splits accented Latin
 * letters into base letter plus combining mark, the marks are dropped, and
 * anything else outside a-z0-9 collapses to single hyphens. The caller still
 * appends a UUID, so two titles that reduce to the same segment never share keys.
 */
export function asciiKeySegment(slug: string): string {
	const segment = slug
		.normalize("NFKD")
		.replace(/\p{Mark}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, KEY_SEGMENT_MAX_LENGTH)
		.replace(/-$/, "");
	return segment || FALLBACK_KEY_SEGMENT;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const VERSIONED_FILE = new RegExp(
	String.raw`^(?:[A-Za-z0-9_-]*-)?${UUID}(?:-\d+)?\.(?:avif|webp|jpg)$`,
);

/**
 * True for a variant whose key-base ends in a minted UUID (artwork, event and
 * profile versions). Those keys are written once and never overwritten, so they
 * are safe to cache as immutable. Seed keys (`artworks/<slug>-<w>.<ext>`) are
 * regenerated in place by `pnpm db:images` and are not versioned.
 *
 * next.config.mjs repeats this test as a route pattern for its CDN header;
 * lib/storage/media-routes.test.ts keeps the two in agreement.
 */
export function isVersionedImageKey(key: string): boolean {
	return VERSIONED_FILE.test(key.slice(key.lastIndexOf("/") + 1));
}
