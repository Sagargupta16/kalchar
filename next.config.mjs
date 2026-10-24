/**
 * Next.js config. The app runs as a dynamic Next app on Vercel: public pages
 * are static/SSG (built from Neon at build time), `/admin` + `/api` are
 * server-rendered. See docs/ARCHITECTURE.md.
 *
 * `trailingSlash: true` keeps the canonical `/work/` URL shape the site has
 * always used (preserves links + SEO from the earlier static era).
 *
 * Browser image requests use the same-origin `/media/*` rewrite below. This
 * keeps privacy-focused browsers from blocking the public R2 hostname while
 * preserving the hand-rolled responsive <picture> pipeline.
 */

import { readdirSync } from "node:fs";

const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
const useImageFixtures = process.env.KALCHAR_TEST_FIXTURES === "1";
const previewLocalArt =
	useImageFixtures && process.env.KALCHAR_ADMIN_PREVIEW === "1" && process.env.VERCEL !== "1";

// Only generated image paths may cross the same-origin media boundary.
// Staged masters and future private/archive prefixes must never be proxied.
const imageFile = String.raw`:image([A-Za-z0-9_-]+\.(?:avif|webp|jpg))`;
const mediaPaths = [
	{ source: `artworks/${imageFile}`, destination: "artworks/:image" },
	{
		source: `events/:eventId([A-Za-z0-9_-]+)/${imageFile}`,
		destination: "events/:eventId/:image",
	},
	{ source: `profile/${imageFile}`, destination: "profile/:image" },
];

// Versioned variants end their key-base in a UUID minted per upload and are
// never overwritten, so Vercel's CDN may keep them for its one-year maximum.
// Seed keys (`artworks/<slug>-<w>.<ext>`) can be regenerated in place by
// `pnpm db:images`, so they get no edge override. This is the route form of
// isVersionedImageKey in lib/storage/image-key.ts; media-routes.test.ts keeps
// the two in agreement. Vercel-CDN-Cache-Control is consumed by Vercel and
// never reaches the browser, which still follows the object's Cache-Control.
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const versionedImageFile = String.raw`:image((?:[A-Za-z0-9_-]*-)?${uuid}(?:-\d+)?\.(?:avif|webp|jpg))`;
const versionedMediaSources = [
	`/media/artworks/${versionedImageFile}`,
	`/media/events/:eventId([A-Za-z0-9_-]+)/${versionedImageFile}`,
	`/media/profile/${versionedImageFile}`,
];
const VERSIONED_CDN_CACHE = { key: "Vercel-CDN-Cache-Control", value: "max-age=31536000" };

/** @type {import('next').NextConfig} */
const nextConfig = {
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	async rewrites() {
		if (!imageBaseUrl && !useImageFixtures) return [];
		// Local admin previews use the real, already-public paintings. Keep CI's
		// generic image fixtures and production's R2 routing independent.
		const localArt = previewLocalArt
			? readdirSync(new URL("./public/artworks/", import.meta.url))
					.filter((name) => /^[A-Za-z0-9_-]+\.jpg$/.test(name))
					.flatMap((name) => {
						const slug = name.slice(0, -4);
						return [
							{
								source: `/media/artworks/${slug}-:width(400|800|1200|1600).:format(avif|webp|jpg)`,
								destination: `/artworks/${name}`,
							},
							{ source: `/media/artworks/${name}`, destination: `/artworks/${name}` },
						];
					})
			: [];
		return [
			...localArt,
			...mediaPaths.map(({ source, destination }) => ({
				source: `/media/${source}`,
				destination: useImageFixtures ? "/logo.jpg" : `${imageBaseUrl}/${destination}`,
			})),
		];
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
				],
			},
			{
				source: "/media/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
				],
			},
			...versionedMediaSources.map((source) => ({ source, headers: [VERSIONED_CDN_CACHE] })),
		];
	},
	// No serverActions.bodySizeLimit override: admin uploads PUT the master
	// straight to R2 from the browser and submit only its staged key, so actions
	// carry text alone. Raising the limit would not help anyway, since Vercel
	// caps function request bodies at ~4.5 MB regardless. See docs/IMAGES.md.
	// Disable the in-app DevTools panel. It first landed in Next 15.5 where, on
	// Windows + pnpm, its `segment-explorer-node` module drifted out of sync
	// with the React Client Manifest after a hot reload and crashed client-
	// component pages until the dev server was restarted. Kept off as a dev-
	// stability flag; it adds zero value here and production never includes it.
	devIndicators: false,
};

export default nextConfig;
