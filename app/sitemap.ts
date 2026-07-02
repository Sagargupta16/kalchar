import type { MetadataRoute } from "next";
import { getAllArtworkSlugs } from "@/lib/data";
import { siteConfig } from "@/lib/site-config";

// Pin this route to build-time static generation (read the catalog once at
// build, bake sitemap.xml) instead of a per-request dynamic handler.
export const dynamic = "force-static";

/**
 * Sitemap, generated at build time. The base URL flows from the single source
 * (lib/site-config), and per-artwork routes come through the data seam
 * (getAllArtworkSlugs), so new pieces appear automatically. robots.txt
 * advertises this file.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = siteConfig.prodUrl.replace(/\/$/, "");
	// This is a force-static route, so the whole site is regenerated on each
	// build/deploy. There's no per-row updatedAt, so the build time is the honest
	// freshness signal to give crawlers -- every URL is as fresh as this build.
	const lastModified = new Date();

	const routes = ["", "/work", "/events", "/about", "/workshops", "/custom-orders", "/contact"];
	const staticEntries: MetadataRoute.Sitemap = routes.map((path) => ({
		url: `${base}${path}/`,
		lastModified,
	}));

	const slugs = await getAllArtworkSlugs();
	const artworkEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
		url: `${base}/work/${slug}/`,
		lastModified,
	}));

	return [...staticEntries, ...artworkEntries];
}
