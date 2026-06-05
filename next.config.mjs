/**
 * Next.js config. The app runs as a dynamic Next app on Vercel: public pages
 * are static/SSG (built from Neon at build time), `/admin` + `/api` are
 * server-rendered. See docs/ARCHITECTURE.md.
 *
 * `trailingSlash: true` keeps the canonical `/work/` URL shape the site has
 * always used (preserves links + SEO from the earlier static era).
 *
 * `images.unoptimized: true` -- the gallery serves artwork from Cloudflare R2
 * via a hand-rolled <picture> (lib/image-base.ts), not next/image, so Next's
 * image optimizer is intentionally off.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
	reactStrictMode: true,
	productionBrowserSourceMaps: false,
	// Disable the in-app DevTools panel. It first landed in Next 15.5 where, on
	// Windows + pnpm, its `segment-explorer-node` module drifted out of sync
	// with the React Client Manifest after a hot reload and crashed client-
	// component pages until the dev server was restarted. Kept off as a dev-
	// stability flag; it adds zero value here and production never includes it.
	devIndicators: false,
};

export default nextConfig;
