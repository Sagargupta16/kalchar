/**
 * Drizzle schema for the Phase 2 catalog (Neon Postgres).
 *
 * Postgres chosen to match the ledger-sync app (one DB provider across both
 * repos, reusing the Neon + Vercel integration). This mirrors the
 * `Artwork` / `Workshop` shape in lib/types.ts so the data seam (lib/data.ts)
 * can swap from JSON-file reads to DB queries without any UI change.
 *
 * Postgres has a native `jsonb` column, so `palette` (string[]) is stored
 * structured rather than as a serialized string.
 *
 * Status is stored explicitly here (Phase 1 derived it from price). The seam
 * keeps the same derive-fallback so older rows without a status still resolve.
 */
import { boolean, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

export const artworks = pgTable("artworks", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	style: text("style").notNull(),
	medium: text("medium").notNull(),
	year: integer("year"),
	dimensions: text("dimensions"),
	/** width / height, for gallery layout decisions. */
	aspectRatio: real("aspect_ratio").notNull().default(0.75),
	featured: boolean("featured").notNull().default(false),
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
	/** Sampled palette of 3-5 hex values. */
	palette: jsonb("palette").$type<string[]>(),
	/** "archive" | "available" | "sold". */
	status: text("status").notNull().default("archive"),
	/** INR. When set, the piece is considered for-sale. */
	priceInr: integer("price_inr"),
});

export const workshops = pgTable("workshops", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	blurb: text("blurb").notNull(),
	durationHours: real("duration_hours"),
	order: integer("order").notNull(),
});

/**
 * Custom-order form dropdown options. One row per option, discriminated by
 * `kind` ("size" | "budget" | "timeline"), so all three dropdowns are one
 * table and a new kind needs no schema change. Editable from /admin so the
 * artist can adjust the choices without a code deploy.
 */
export const orderPresets = pgTable("order_presets", {
	id: text("id").primaryKey(),
	kind: text("kind").notNull(),
	label: text("label").notNull(),
	order: integer("order").notNull(),
});

/**
 * Admin allowlist. Replaces a static ADMIN_EMAILS env var so a logged-in
 * maintainer can add/remove others from the panel without a redeploy. The
 * Auth.js signIn callback checks an email against this table.
 *
 * `isRoot` marks the bootstrap maintainer (sg85207@gmail.com); root rows can't
 * be removed, so the panel can never delete its way into a lockout.
 */
export const maintainers = pgTable("maintainers", {
	email: text("email").primaryKey(),
	name: text("name"),
	/** True for the seeded bootstrap maintainer; protected from removal. */
	isRoot: boolean("is_root").notNull().default(false),
	/** Email of the maintainer who added this one (null for the root seed). */
	addedBy: text("added_by"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ArtworkRow = typeof artworks.$inferSelect;
export type ArtworkInsert = typeof artworks.$inferInsert;
export type WorkshopRow = typeof workshops.$inferSelect;
export type WorkshopInsert = typeof workshops.$inferInsert;
export type OrderPresetRow = typeof orderPresets.$inferSelect;
export type OrderPresetInsert = typeof orderPresets.$inferInsert;
export type MaintainerRow = typeof maintainers.$inferSelect;
export type MaintainerInsert = typeof maintainers.$inferInsert;
