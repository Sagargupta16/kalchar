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
import { asc, desc, eq } from "drizzle-orm";
import siteJson from "@/data/site.json";
import { deriveStatus, isForSale } from "./catalog";
import { db } from "./db/client";
import {
	type ArtworkRow,
	artworks,
	type CategoryRow,
	categories,
	type EventRow,
	events,
	type LeadRow,
	leads,
	type OrderPresetRow,
	orderPresets,
	settings,
	type TestimonialRow,
	testimonials,
	type WorkshopRow,
	workshops,
} from "./db/schema";
import type {
	ArtStyle,
	Artwork,
	Category,
	Event,
	Lead,
	LeadStatus,
	OrderPreset,
	OrderPresetKind,
	OrderPresets,
	Site,
	Testimonial,
	Workshop,
} from "./types";

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
	const rows = await db.select().from(artworks).orderBy(asc(artworks.order), asc(artworks.slug));
	return rows.map(toArtwork);
}

/**
 * Currently for-sale artworks: priced (positive) and not sold. Uses the shared
 * `isForSale` guard rather than a bare `status === "available"` check, so a
 * piece whose status drifted to "available" without a real price can never leak
 * into the buy filter or its count.
 */
export async function getAvailableArtworks(): Promise<readonly Artwork[]> {
	return (await getAllArtworks()).filter(isForSale);
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

/**
 * One representative artwork per art style, for the custom-order style picker.
 * Prefers a featured piece of that style, else the lowest-order one. Styles
 * with no artwork are omitted (the picker falls back to a text chip for them).
 * Returns a `style -> { slug, image }` map.
 */
export async function getStyleSamples(): Promise<Record<string, { slug: string; image: string }>> {
	const all = await getAllArtworks();
	const map: Record<string, { slug: string; image: string }> = {};
	for (const a of all) {
		const existing = map[a.style];
		// First match wins, but a featured piece upgrades a non-featured one.
		if (!existing) {
			map[a.style] = { slug: a.slug, image: a.image };
		} else if (a.featured) {
			const current = all.find((x) => x.slug === existing.slug);
			if (!current?.featured) map[a.style] = { slug: a.slug, image: a.image };
		}
	}
	return map;
}

/** Slugs of every artwork -- used by `generateStaticParams` for `/work/[slug]`. */
export async function getAllArtworkSlugs(): Promise<readonly string[]> {
	return (await getAllArtworks()).map((a) => a.slug);
}

function toCategory(row: CategoryRow): Category {
	return { id: row.id, name: row.name, order: row.order };
}

/** All categories as full rows (admin list), sorted by `order`. */
export async function getAllCategories(): Promise<readonly Category[]> {
	const rows = await db
		.select()
		.from(categories)
		.orderBy(asc(categories.order), asc(categories.id));
	return rows.map(toCategory);
}

/**
 * Category names for public UI (work filter, style picker, hero chips).
 * Falls back to the `site.json` styles array when the DB has none yet
 * (pre-seed), so the site is never empty.
 */
export async function getCategoryNames(): Promise<ArtStyle[]> {
	const rows = await getAllCategories();
	if (rows.length > 0) return rows.map((c) => c.name);
	return [...((siteJson as Site).styles ?? [])];
}

/** All workshops, sorted by `order` ascending. */
export async function getAllWorkshops(): Promise<readonly Workshop[]> {
	const rows = await db.select().from(workshops).orderBy(asc(workshops.order), asc(workshops.slug));
	return rows.map(toWorkshop);
}

function toOrderPreset(row: OrderPresetRow): OrderPreset {
	return {
		id: row.id,
		kind: row.kind as OrderPresetKind,
		label: row.label,
		order: row.order,
	};
}

/** All custom-order presets, flat, sorted by kind then order (admin list). */
export async function getAllOrderPresets(): Promise<readonly OrderPreset[]> {
	const rows = await db
		.select()
		.from(orderPresets)
		.orderBy(asc(orderPresets.kind), asc(orderPresets.order), asc(orderPresets.id));
	return rows.map(toOrderPreset);
}

/**
 * Preset labels grouped for the custom-order form. Falls back to the
 * `site.json` arrays when the DB has no presets of a kind yet (pre-seed), so
 * the form is never empty.
 */
export async function getOrderPresets(): Promise<OrderPresets> {
	const rows = await getAllOrderPresets();
	const pick = (kind: OrderPresetKind, fallback: string[]) => {
		const labels = rows.filter((r) => r.kind === kind).map((r) => r.label);
		return labels.length > 0 ? labels : fallback;
	};
	const co = (siteJson as Site).sections.customOrders as {
		sizes?: string[];
		budgets?: string[];
		timelines?: string[];
	};
	return {
		sizes: pick("size", co?.sizes ?? []),
		budgets: pick("budget", co?.budgets ?? []),
		timelines: pick("timeline", co?.timelines ?? []),
	};
}

function toEvent(row: EventRow): Event {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		// ISO date string so it crosses the server/client boundary cleanly.
		eventDate: row.eventDate.toISOString(),
		category: row.category ?? undefined,
		images: row.images ?? [],
		featured: row.featured,
		order: row.order,
	};
}

/**
 * Events ordered for display: pinned first (the `featured` flag), then most
 * recent by date, with `order` as a stable tie-break inside the same date.
 * So a maintainer can pin a highlight to the top, and everything else is
 * automatically latest-first.
 */
export async function getAllEvents(): Promise<readonly Event[]> {
	const rows = await db
		.select()
		.from(events)
		.orderBy(desc(events.featured), desc(events.eventDate), asc(events.order), asc(events.id));
	return rows.map(toEvent);
}

/** The most recent `limit` events, for the home preview strip. */
export async function getRecentEvents(limit: number): Promise<readonly Event[]> {
	return (await getAllEvents()).slice(0, limit);
}

function toLead(row: LeadRow): Lead {
	return {
		id: row.id,
		name: row.name ?? undefined,
		style: row.style ?? undefined,
		size: row.size ?? undefined,
		budget: row.budget ?? undefined,
		timeline: row.timeline ?? undefined,
		brief: row.brief,
		status: row.status as LeadStatus,
		createdAt: row.createdAt.toISOString(),
	};
}

/** All captured custom-order leads, newest first, for the admin queue. */
export async function getAllLeads(): Promise<readonly Lead[]> {
	const rows = await db.select().from(leads).orderBy(desc(leads.createdAt), asc(leads.id));
	return rows.map(toLead);
}

function toTestimonial(row: TestimonialRow): Testimonial {
	return {
		id: row.id,
		quote: row.quote,
		authorName: row.authorName,
		authorLocation: row.authorLocation ?? undefined,
		artworkSlug: row.artworkSlug ?? undefined,
		featured: row.featured,
		order: row.order,
	};
}

/** All testimonials, featured first then by order, for the admin list. */
export async function getAllTestimonials(): Promise<readonly Testimonial[]> {
	const rows = await db
		.select()
		.from(testimonials)
		.orderBy(desc(testimonials.featured), asc(testimonials.order), asc(testimonials.id));
	return rows.map(toTestimonial);
}

/** Featured testimonials for the home page (empty array hides the section). */
export async function getFeaturedTestimonials(): Promise<readonly Testimonial[]> {
	return (await getAllTestimonials()).filter((t) => t.featured);
}

/** Testimonials soft-linked to a specific artwork, for its detail page. */
export async function getTestimonialsForArtwork(slug: string): Promise<readonly Testimonial[]> {
	return (await getAllTestimonials()).filter((t) => t.artworkSlug === slug);
}

/**
 * Read a single setting value by key, or undefined if unset. Typed by the
 * caller. Settings hold the artist profile image key + the home-intro toggle.
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
	const [row] = await db.select().from(settings).where(eq(settings.key, key));
	return (row?.value as T | undefined) ?? undefined;
}

/** Site-wide copy: brand, nav, contact, section text, etc. Stays JSON (sync). */
export function getSite(): Site {
	return siteJson;
}
