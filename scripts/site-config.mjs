// Shared site constants used by both vite.config.ts (build-time SEO plugin)
// and scripts/generate-sitemap.mjs. ESM .mjs so Node can run the script
// directly and the TS config can import it via Vite's resolver.
//
// Domain landed 2026-05-24: kalchar.co.in is the canonical home, served from
// the repo root (not a subpath). REPO_NAME is kept only for local-dev
// reference -- it's no longer in any URL.

export const REPO_NAME = "folk-art-portfolio";
export const SITE = "https://kalchar.co.in";
export const BASE = "/";
export const PROD_URL = `${SITE}${BASE}`;
