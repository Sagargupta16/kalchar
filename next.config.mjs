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

const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	async rewrites() {
		if (!imageBaseUrl) return [];
		return [
			{
				source: "/media/:path*",
				destination: `${imageBaseUrl}/:path*`,
			},
		];
	},
	experimental: {
		// Admin image uploads (artwork, multi-photo events, the artist profile)
		// travel inside the server action's FormData, so the whole batch counts
		// against this body limit. The 1 MB default rejects even a single phone
		// photo. Raised generously so a multi-image event upload goes through.
		// Note: on Vercel the platform also caps serverless request bodies
		// (~4.5 MB), so very large batches should upload a few photos at a time;
		// see docs/IMAGES.md.
		serverActions: {
			bodySizeLimit: "25mb",
		},
	},
	// Disable the in-app DevTools panel. It first landed in Next 15.5 where, on
	// Windows + pnpm, its `segment-explorer-node` module drifted out of sync
	// with the React Client Manifest after a hot reload and crashed client-
	// component pages until the dev server was restarted. Kept off as a dev-
	// stability flag; it adds zero value here and production never includes it.
	devIndicators: false,
};

export default nextConfig;
