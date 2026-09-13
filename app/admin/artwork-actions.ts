"use server";

/**
 * Artwork server actions: the catalog itself (create, edit, image replacement,
 * palette, reorder, delete). Split out of actions.ts to stay under the repo's
 * 500-line file ceiling; the supporting entities (workshops, presets,
 * categories, maintainers) remain there.
 *
 * Every action re-checks the maintainer session before mutating, and returns
 * failures as data rather than throwing, because Next replaces messages thrown
 * inside a server action with a sanitized digest in production
 * (see lib/action-result.ts).
 */
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { type ActionResult, failure } from "@/lib/action-result";
import { quickStateBlockedReason } from "@/lib/artwork-status";
import { db } from "@/lib/db/client";
import { artworks } from "@/lib/db/schema";
import { artworkImageKey, R2_ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { revalidateEntity } from "@/lib/revalidate";
import { cleanupFailedImageWrite, ImageConflictError } from "@/lib/storage/image-mutation";
import { extractPalette, processNewArtworkImage } from "@/lib/storage/process-artwork-image";
import { discardStagedImages, readStagedImage } from "@/lib/storage/staged-upload";
import type { ArtworkStatus } from "@/lib/types";
import { formString, nextOrderSql, requireMaintainer, slugify } from "./_helpers";
import { saveCompleteOrder } from "./_reorder";

const ARTWORK_STATUSES = new Set<ArtworkStatus>(["archive", "available", "sold"]);
const MIN_YEAR = 1900;

/** Latest year a piece can carry: next year, so a piece dated for an upcoming show passes. */
function maxYear(): number {
	return new Date().getFullYear() + 1;
}

/** Shape first (whole, positive), then range: a stray digit made 20260 pass before the range check existed. */
function assertYear(year: number): void {
	if (!Number.isInteger(year) || year <= 0) {
		throw new Error("Year must be a positive whole number.");
	}
	if (year < MIN_YEAR || year > maxYear()) {
		throw new Error(`Year must be between ${MIN_YEAR} and ${maxYear()}.`);
	}
}

/**
 * Validate and commit all editable artwork fields in one atomic update.
 * Failures come back as data so the real reason survives to the admin UI in
 * production (see lib/action-result).
 */
export async function updateArtwork(
	slug: string,
	fields: {
		title: string;
		style: string;
		description: string | null;
		medium: string;
		dimensions: string | null;
		year: number | null;
		priceInr: number | null;
		status: ArtworkStatus;
		featured: boolean;
	},
): Promise<ActionResult> {
	try {
		return await updateArtworkUnsafe(slug, fields);
	} catch (error) {
		console.error("updateArtwork failed", error);
		return failure(error);
	}
}

async function updateArtworkUnsafe(
	slug: string,
	fields: {
		title: string;
		style: string;
		description: string | null;
		medium: string;
		dimensions: string | null;
		year: number | null;
		priceInr: number | null;
		status: ArtworkStatus;
		featured: boolean;
	},
): Promise<ActionResult> {
	await requireMaintainer();
	const title = fields.title.trim();
	const style = fields.style.trim();
	const medium = fields.medium.trim();
	if (!title || !style || !medium) {
		throw new Error("Title, category, and medium are required.");
	}
	if (fields.year !== null) assertYear(fields.year);
	if (fields.priceInr !== null && (!Number.isInteger(fields.priceInr) || fields.priceInr <= 0)) {
		throw new Error("Price must be a positive whole number.");
	}
	if (!ARTWORK_STATUSES.has(fields.status)) {
		throw new Error("Choose a valid status.");
	}
	if (typeof fields.featured !== "boolean") {
		throw new Error("Featured must be true or false.");
	}

	const updated = await db
		.update(artworks)
		.set({
			title,
			style,
			medium,
			description: fields.description?.trim() || null,
			dimensions: fields.dimensions?.trim() || null,
			year: fields.year,
			priceInr: fields.priceInr,
			status: fields.status,
			featured: fields.featured,
		})
		.where(eq(artworks.slug, slug))
		.returning({ slug: artworks.slug });
	if (updated.length === 0) throw new Error("Piece not found.");
	revalidateEntity("artworks");
	return { ok: true };
}

/**
 * Replace an artwork image using a new key. Published versions stay in R2
 * so a database restore can still resolve its image references.
 * Failures come back as data so the real reason survives to the admin UI in
 * production (see lib/action-result).
 */
export async function replaceArtworkImage(slug: string, formData: FormData): Promise<ActionResult> {
	try {
		return await replaceArtworkImageUnsafe(slug, formData);
	} catch (error) {
		console.error("replaceArtworkImage failed", error);
		return failure(error);
	}
}

async function replaceArtworkImageUnsafe(slug: string, formData: FormData): Promise<ActionResult> {
	await requireMaintainer();
	const [row] = await db
		.select({ image: artworks.image })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (!row) throw new Error("Piece not found.");

	const stagedKey = formString(formData, "imageKey").trim();
	if (!stagedKey) throw new Error("An image file is required.");
	const buffer = await readStagedImage(stagedKey);
	const { image, aspectRatio, palette } = await processNewArtworkImage(slug, buffer);
	await discardStagedImages([stagedKey]).catch((error) => {
		console.error("Staged upload cleanup failed after replacement.", error);
	});
	try {
		const updated = await db
			.update(artworks)
			.set({
				image,
				aspectRatio,
				palette: palette.length > 0 ? palette : null,
			})
			.where(and(eq(artworks.slug, slug), eq(artworks.image, row.image)))
			.returning({ slug: artworks.slug });
		if (updated.length === 0) {
			throw new ImageConflictError("Artwork image changed. Refresh and try again.");
		}
	} catch (error) {
		await cleanupFailedImageWrite([`artworks/${artworkImageKey(image)}`], error);
		throw error;
	}

	revalidateEntity("artworks");
	return { ok: true };
}

/**
 * Create a new artwork from an uploaded image + metadata (FormData). Failures
 * come back as data so the real reason survives to the admin UI in production
 * (see lib/action-result).
 */
export async function createArtwork(formData: FormData): Promise<ActionResult<{ slug: string }>> {
	try {
		return await createArtworkUnsafe(formData);
	} catch (error) {
		console.error("createArtwork failed", error);
		return failure(error);
	}
}

function optionalPositiveInteger(formData: FormData, field: string, label: string): number | null {
	const raw = formData.get(field);
	if (typeof raw !== "string" || !raw.trim()) return null;
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${label} must be a positive whole number.`);
	}
	return value;
}

/** Optional year from the add form, bounded to a plausible range (a stray digit made 20260 pass). */
function optionalYear(formData: FormData): number | null {
	const raw = formData.get("year");
	if (typeof raw !== "string" || !raw.trim()) return null;
	const value = Number(raw);
	assertYear(value);
	return value;
}

async function createArtworkUnsafe(formData: FormData): Promise<ActionResult<{ slug: string }>> {
	await requireMaintainer();

	const title = formString(formData, "title").trim();
	const style = formString(formData, "style").trim();
	const medium = formString(formData, "medium").trim();
	const stagedKey = formString(formData, "imageKey").trim();

	if (!title || !style || !medium) throw new Error("Title, category, and medium are required.");
	if (!stagedKey) throw new Error("An image file is required.");

	const slug = slugify(title);
	if (!slug) throw new Error("Title must contain letters or numbers.");

	const existing = await db
		.select({ slug: artworks.slug })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (existing.length > 0) {
		throw new Error(`A piece called "${title}" already exists. Choose a different title.`);
	}

	const priceInr = optionalPositiveInteger(formData, "priceInr", "Price");
	const year = optionalYear(formData);

	const buffer = await readStagedImage(stagedKey);
	const { image, aspectRatio, palette } = await processNewArtworkImage(slug, buffer);
	await discardStagedImages([stagedKey]).catch((error) => {
		console.error("Staged upload cleanup failed after create.", error);
	});

	try {
		const inserted = await db
			.insert(artworks)
			.values({
				slug,
				title,
				style,
				medium,
				image,
				aspectRatio,
				// Read queries include a stable secondary key for concurrent ties.
				order: nextOrderSql(artworks),
				featured: false,
				description: formString(formData, "description").trim() || null,
				dimensions: formString(formData, "dimensions").trim() || null,
				year,
				palette: palette.length > 0 ? palette : null,
				priceInr,
				status: priceInr ? "available" : "archive",
			})
			.onConflictDoNothing({ target: artworks.slug })
			.returning({ slug: artworks.slug });
		if (inserted.length === 0) {
			throw new ImageConflictError(
				`A piece called "${title}" already exists. Choose a different title.`,
			);
		}
	} catch (error) {
		await cleanupFailedImageWrite([`artworks/${artworkImageKey(image)}`], error);
		throw error;
	}

	revalidateEntity("artworks");
	return { ok: true, slug };
}

/** Re-sample the palette for a piece from its stored master image in R2. */
export async function regeneratePalette(slug: string): Promise<ActionResult> {
	try {
		return await regeneratePaletteUnsafe(slug);
	} catch (error) {
		console.error("regeneratePalette failed", error);
		return failure(error);
	}
}

async function regeneratePaletteUnsafe(slug: string): Promise<ActionResult> {
	await requireMaintainer();
	const [row] = await db
		.select({ image: artworks.image })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (!row) throw new Error("Piece not found.");
	const res = await fetch(`${R2_ARTWORK_IMAGE_BASE}/${artworkImageKey(row.image)}.jpg`);
	if (!res.ok) throw new Error("Could not fetch the master image.");
	const buffer = Buffer.from(await res.arrayBuffer());
	const palette = await extractPalette(buffer);
	const updated = await db
		.update(artworks)
		.set({ palette: palette.length > 0 ? palette : null })
		.where(and(eq(artworks.slug, slug), eq(artworks.image, row.image)))
		.returning({ slug: artworks.slug });
	if (updated.length === 0) {
		throw new ImageConflictError("Artwork image changed. Refresh and try again.");
	}
	revalidateEntity("artworks");
	return { ok: true };
}

/** Reorder artworks by providing the new slug sequence. */
export async function reorderArtworks(slugs: string[]): Promise<ActionResult> {
	try {
		return await reorderArtworksUnsafe(slugs);
	} catch (error) {
		console.error("reorderArtworks failed", error);
		return failure(error);
	}
}

async function reorderArtworksUnsafe(slugs: string[]): Promise<ActionResult> {
	await requireMaintainer();
	await saveCompleteOrder({
		table: artworks,
		key: artworks.slug,
		ids: slugs,
		label: "Artwork",
	});
	revalidateEntity("artworks");
	return { ok: true };
}

/** Remove an artwork from the catalog, retaining published images for recovery. */
export async function deleteArtwork(slug: string): Promise<ActionResult> {
	try {
		return await deleteArtworkUnsafe(slug);
	} catch (error) {
		console.error("deleteArtwork failed", error);
		return failure(error);
	}
}

async function deleteArtworkUnsafe(slug: string): Promise<ActionResult> {
	await requireMaintainer();
	await db.delete(artworks).where(eq(artworks.slug, slug));
	revalidateEntity("artworks");
	return { ok: true };
}

/** Flip the home-hero flag from the row. */
export async function setArtworkFeatured(slug: string, featured: boolean): Promise<ActionResult> {
	try {
		return await setArtworkFeaturedUnsafe(slug, featured);
	} catch (error) {
		console.error("setArtworkFeatured failed", error);
		return failure(error);
	}
}

async function setArtworkFeaturedUnsafe(slug: string, featured: boolean): Promise<ActionResult> {
	await requireMaintainer();
	if (typeof featured !== "boolean") throw new Error("Choose whether the piece is featured.");
	const [updated] = await db
		.update(artworks)
		.set({ featured })
		.where(eq(artworks.slug, slug))
		.returning({ slug: artworks.slug });
	if (!updated) throw new Error("Piece not found.");
	revalidateEntity("artworks");
	return { ok: true };
}

/**
 * Change availability from the row. "archive" on a priced piece is rejected in
 * the WHERE clause (deriveStatus would read it back as Available), so the common
 * path stays one statement and only the rejected path pays a second read to
 * tell "missing" from "priced" apart.
 */
export async function setArtworkStatus(slug: string, status: ArtworkStatus): Promise<ActionResult> {
	try {
		return await setArtworkStatusUnsafe(slug, status);
	} catch (error) {
		console.error("setArtworkStatus failed", error);
		return failure(error);
	}
}

async function setArtworkStatusUnsafe(slug: string, status: ArtworkStatus): Promise<ActionResult> {
	await requireMaintainer();
	if (!ARTWORK_STATUSES.has(status)) throw new Error("Choose a valid status.");
	const [updated] = await db
		.update(artworks)
		.set({ status })
		.where(
			status === "archive"
				? and(eq(artworks.slug, slug), or(isNull(artworks.priceInr), lte(artworks.priceInr, 0)))
				: eq(artworks.slug, slug),
		)
		.returning({ slug: artworks.slug });
	if (!updated) {
		if (status !== "archive") throw new Error("Piece not found.");
		const [row] = await db
			.select({ priceInr: artworks.priceInr })
			.from(artworks)
			.where(eq(artworks.slug, slug));
		if (!row) throw new Error("Piece not found.");
		throw new Error(quickStateBlockedReason("archive", row.priceInr) ?? "Piece not found.");
	}
	revalidateEntity("artworks");
	return { ok: true };
}
