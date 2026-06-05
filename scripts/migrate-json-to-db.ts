/**
 * One-shot migration: data/*.json -> Neon Postgres rows.
 *
 * Run after `pnpm db:push` has created the tables and the env vars are set
 * (see .env.example and docs/DATABASE.md):
 *   pnpm db:seed
 *
 * This seeds the catalog metadata only. Uploading the image variants to R2 is a
 * separate step -- `pnpm db:images` (scripts/migrate-images-to-r2.ts). The
 * `image` column keeps the `<slug>.jpg` filename, which resolves against the R2
 * public base via lib/image-base.ts.
 *
 * Idempotent: uses onConflictDoUpdate keyed on slug, so re-running re-syncs
 * rather than duplicating.
 */
// DATABASE_URL is loaded via `tsx --env-file=.env.local` (see the db:seed script).
import artworksJson from "../data/artworks.json";
import siteJson from "../data/site.json";
import { db } from "../lib/db/client";
import { artworks, workshops } from "../lib/db/schema";
import type { Artwork, Workshop } from "../lib/types";

function deriveStatus(a: Artwork): "archive" | "available" | "sold" {
	if (a.status) return a.status;
	if (typeof a.priceInr === "number") return "available";
	return "archive";
}

async function main() {
	const items = (artworksJson as { items: Artwork[] }).items;
	console.log(`Seeding ${items.length} artworks...`);
	for (const a of items) {
		await db
			.insert(artworks)
			.values({
				slug: a.slug,
				title: a.title,
				style: a.style,
				medium: a.medium,
				year: a.year,
				dimensions: a.dimensions,
				aspectRatio: a.aspectRatio,
				featured: a.featured,
				order: a.order,
				description: a.description,
				image: a.image,
				palette: a.palette ?? null,
				status: deriveStatus(a),
				priceInr: a.priceInr,
			})
			.onConflictDoUpdate({
				target: artworks.slug,
				set: {
					title: a.title,
					style: a.style,
					medium: a.medium,
					year: a.year,
					dimensions: a.dimensions,
					aspectRatio: a.aspectRatio,
					featured: a.featured,
					order: a.order,
					description: a.description,
					image: a.image,
					palette: a.palette ?? null,
					status: deriveStatus(a),
					priceInr: a.priceInr,
				},
			});
	}

	const shops = ((siteJson as { workshops?: Workshop[] }).workshops ?? []) as Workshop[];
	console.log(`Seeding ${shops.length} workshops...`);
	for (const w of shops) {
		await db
			.insert(workshops)
			.values({
				slug: w.slug,
				title: w.title,
				blurb: w.blurb,
				durationHours: w.durationHours,
				order: w.order,
			})
			.onConflictDoUpdate({
				target: workshops.slug,
				set: {
					title: w.title,
					blurb: w.blurb,
					durationHours: w.durationHours,
					order: w.order,
				},
			});
	}

	console.log("Seed complete.");
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
