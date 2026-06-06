/**
 * One-shot bootstrap: data/*.json -> Neon Postgres rows.
 *
 * Run after `pnpm db:push` has created the tables and the env vars are set
 * (see .env.example and docs/DATABASE.md):
 *   pnpm db:seed
 *
 * INSERT-IF-ABSENT: every insert uses onConflictDoNothing, so re-running is
 * SAFE -- it only adds rows whose primary key (slug / id) doesn't already
 * exist. It never overwrites an existing row and never resurrects a deleted
 * one. This means admin changes made through /admin (reorders, edits,
 * deletions) survive a re-seed. To wipe and re-import from JSON, clear the
 * tables first (manual, intentional) then run this.
 *
 * Image variants are uploaded separately by `pnpm db:images`
 * (scripts/migrate-images-to-r2.ts).
 */
// DATABASE_URL is loaded via `tsx --env-file=.env.local` (see the db:seed script).
import artworksJson from "../data/artworks.json";
import siteJson from "../data/site.json";
import { db } from "../lib/db/client";
import { artworks, categories, orderPresets, workshops } from "../lib/db/schema";
import type { Artwork, Workshop } from "../lib/types";

function deriveStatus(a: Artwork): "archive" | "available" | "sold" {
	if (a.status) return a.status;
	if (typeof a.priceInr === "number") return "available";
	return "archive";
}

function slugifyId(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-/, "")
		.replace(/-$/, "");
}

async function main() {
	const items = (artworksJson as { items: Artwork[] }).items;
	console.log(`Seeding ${items.length} artworks (insert-if-absent)...`);
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
			.onConflictDoNothing({ target: artworks.slug });
	}

	const shops = (siteJson as { workshops?: Workshop[] }).workshops ?? [];
	console.log(`Seeding ${shops.length} workshops (insert-if-absent)...`);
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
			.onConflictDoNothing({ target: workshops.slug });
	}

	// Custom-order presets: sizes / budgets / timelines from site.json.
	const co = (siteJson as { sections?: { customOrders?: Record<string, string[]> } }).sections
		?.customOrders;
	const presetKinds: Array<["size" | "budget" | "timeline", string[]]> = [
		["size", co?.sizes ?? []],
		["budget", co?.budgets ?? []],
		["timeline", co?.timelines ?? []],
	];
	const presetCount = presetKinds.reduce((n, [, labels]) => n + labels.length, 0);
	console.log(`Seeding ${presetCount} order presets (insert-if-absent)...`);
	for (const [kind, labels] of presetKinds) {
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i];
			if (!label) continue;
			const id = `${kind}-${i + 1}`;
			await db
				.insert(orderPresets)
				.values({ id, kind, label, order: i + 1 })
				.onConflictDoNothing({ target: orderPresets.id });
		}
	}

	// Categories from site.json styles array.
	const styleList = (siteJson as { styles?: string[] }).styles ?? [];
	console.log(`Seeding ${styleList.length} categories (insert-if-absent)...`);
	for (let i = 0; i < styleList.length; i++) {
		const name = styleList[i];
		if (!name) continue;
		const id = slugifyId(name);
		await db
			.insert(categories)
			.values({ id, name, order: i + 1 })
			.onConflictDoNothing({ target: categories.id });
	}

	console.log("Seed complete. (Existing rows were left untouched.)");
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
