/**
 * THE DATA SEAM.
 *
 * Phase 2: catalog (artworks + workshops) is read from the Neon Postgres DB
 * through Drizzle. Site config (brand, nav, contact, section copy, styles)
 * stays in `data/site.json` -- it's static chrome, not catalog data, and
 * `app/layout.tsx` reads it at module top-level where async can't reach.
 *
 * The `Artwork[]` / `Workshop[]` / `Site` shapes returned to UI code are
 * unchanged from Phase 1; only the catalog source moved from JSON to DB, so
 * callers just `await` the artwork/workshop getters now.
 *
 * Catalog reads are async (DB). Under static export they run at build time and
 * bake into the HTML; once the admin panel + API routes land and the export is
 * dropped, the same functions serve dynamic requests. `getSite()` is sync.
 *
 * Do not import `data/site.json` (or query the DB) directly outside this file.
 */
import { asc } from "drizzle-orm";
import siteJson from "@/data/site.json";
import { db } from "./db/client";
import { type ArtworkRow, artworks, type WorkshopRow, workshops } from "./db/schema";
import type { ArtStyle, Artwork, ArtworkStatus, Site, Workshop } from "./types";

/**
 * Phase 1 derived status from `priceInr`. The DB stores it explicitly now, but
 * we keep the fallback so a row left at the default "archive" still resolves
 * to "available" the moment a price is set, without an extra admin step.
 */
function deriveStatus(row: ArtworkRow): ArtworkStatus {
	if (row.status === "available" || row.status === "sold" || row.status === "archive") {
		if (row.status === "archive" && typeof row.priceInr === "number") return "available";
		return row.status;
	}
	return typeof row.priceInr === "number" ? "available" : "archive";
}

/** Map a DB row (nullable columns) to the UI `Artwork` shape (optional fields). */
function toArtwork(row: ArtworkRow): Artwork {
	return {
		slug: row.slug,
		title: row.title,
		style: row.style as ArtStyle,
		medium: row.medium,
		year: row.year ?? undefined,
		dimensions: row.dimensions ?? undefined,
		aspectRatio: row.aspectRatio,
		featured: row.featured,
		order: row.order,
		description: row.description ?? undefined,
		image: row.image,
		palette: row.palette ?? undefined,
		status: deriveStatus(row),
		priceInr: row.priceInr ?? undefined,
	};
}

function toWorkshop(row: WorkshopRow): Workshop {
	return {
		slug: row.slug,
		title: row.title,
		blurb: row.blurb,
		durationHours: row.durationHours ?? undefined,
		order: row.order,
	};
}

/** All artworks, sorted by `order` ascending. */
export async function getAllArtworks(): Promise<readonly Artwork[]> {
	const rows = await db.select().from(artworks).orderBy(asc(artworks.order));
	return rows.map(toArtwork);
}

/** Currently for-sale artworks. */
export async function getAvailableArtworks(): Promise<readonly Artwork[]> {
	return (await getAllArtworks()).filter((a) => a.status === "available");
}

/** The featured piece for the hero, or the lowest-order one as fallback. */
export async function getFeaturedArtwork(): Promise<Artwork | undefined> {
	const all = await getAllArtworks();
	return all.find((a) => a.featured) ?? all[0];
}

/** Look up a single artwork by slug. */
export async function getArtworkBySlug(slug: string): Promise<Artwork | undefined> {
	return (await getAllArtworks()).find((a) => a.slug === slug);
}

/** Slugs of every artwork -- used by `generateStaticParams` for `/work/[slug]`. */
export async function getAllArtworkSlugs(): Promise<readonly string[]> {
	return (await getAllArtworks()).map((a) => a.slug);
}

/** All workshops, sorted by `order` ascending. */
export async function getAllWorkshops(): Promise<readonly Workshop[]> {
	const rows = await db.select().from(workshops).orderBy(asc(workshops.order));
	return rows.map(toWorkshop);
}

/** Site-wide copy: brand, nav, contact, section text, etc. Stays JSON (sync). */
export function getSite(): Site {
	return siteJson as Site;
}
