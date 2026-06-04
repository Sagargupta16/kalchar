/**
 * Drizzle schema for the Phase 2 catalog (Turso / libSQL, SQLite dialect).
 *
 * This mirrors the `Artwork` / `Workshop` shape in lib/types.ts so the data
 * seam (lib/data.ts) can swap from JSON-file reads to DB queries without any
 * UI change. SQLite has no native array/object columns, so `palette` is stored
 * as a JSON string and parsed in the seam.
 *
 * Status is stored explicitly here (Phase 1 derived it from price). The seam
 * keeps the same derive-fallback so older rows without a status still resolve.
 */
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const artworks = sqliteTable("artworks", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	style: text("style").notNull(),
	medium: text("medium").notNull(),
	year: integer("year"),
	dimensions: text("dimensions"),
	/** width / height, for gallery layout decisions. */
	aspectRatio: real("aspect_ratio").notNull().default(0.75),
	featured: integer("featured", { mode: "boolean" }).notNull().default(false),
	/** Sort key, ascending. Lower = earlier in the gallery. */
	order: integer("order").notNull(),
	description: text("description"),
	/**
	 * Image identifier. Phase 1: filename in public/artworks/. Phase 2: the R2
	 * object key (the public URL is R2_PUBLIC_BASE_URL + this key). The
	 * <picture>/srcset contract in art-image.tsx is unchanged; only the base
	 * URL differs.
	 */
	image: text("image").notNull(),
	/** JSON-encoded string[] of 3-5 hex values. Parsed in the seam. */
	palette: text("palette"),
	/** "archive" | "available" | "sold". */
	status: text("status").notNull().default("archive"),
	/** INR. When set, the piece is considered for-sale. */
	priceInr: integer("price_inr"),
});

export const workshops = sqliteTable("workshops", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	blurb: text("blurb").notNull(),
	durationHours: real("duration_hours"),
	order: integer("order").notNull(),
});

export type ArtworkRow = typeof artworks.$inferSelect;
export type ArtworkInsert = typeof artworks.$inferInsert;
export type WorkshopRow = typeof workshops.$inferSelect;
export type WorkshopInsert = typeof workshops.$inferInsert;
