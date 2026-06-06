/**
 * Single source of truth for site URLs and base paths.
 *
 * To swap domains, edit only this file. Nothing else hardcodes the host.
 * Consumed by sitemap.ts, OG metadata, and anywhere an absolute URL is needed.
 */

export const siteConfig = {
	url: "https://kalchar.co.in",
	basePath: "", // empty = served at apex; e.g. "/preview" if served on subpath
	get prodUrl() {
		return `${this.url}${this.basePath}/`;
	},
} as const;

export type SiteConfig = typeof siteConfig;
