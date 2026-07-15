"use server";

/**
 * Admin server actions. Every action re-checks the session (defense in depth --
 * the proxy already gates /admin, but actions can be invoked directly) and
 * confirms the caller is a maintainer before mutating.
 *
 * Artwork mutations touch both the DB row and the R2 image variants; maintainer
 * mutations touch the roster. All revalidate the affected paths so the public
 * gallery and the admin list reflect changes immediately.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { artworks, categories, orderPresets, workshops } from "@/lib/db/schema";
import { artworkImageKey, R2_ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { addMaintainer, removeMaintainer } from "@/lib/maintainers";
import { readImageUpload } from "@/lib/storage/image-upload";
import {
	deleteArtworkImages,
	extractPalette,
	processArtworkImage,
} from "@/lib/storage/process-artwork-image";
import type { ArtworkStatus, OrderPresetKind } from "@/lib/types";
import { formString, getNextOrder, nextOrderSql, requireMaintainer, slugify } from "./_helpers";

const ARTWORK_STATUSES = new Set<ArtworkStatus>(["archive", "available", "sold"]);

function revalidateCatalog(slug?: string) {
	revalidatePath("/");
	revalidatePath("/work");
	revalidatePath("/admin");
	// The Meta Commerce feed and the sitemap both derive from the catalog, so a
	// price/status/create/delete change must refresh them too or they go stale.
	revalidatePath("/catalog.csv");
	revalidatePath("/sitemap.xml");
	if (slug) revalidatePath(`/work/${slug}`);
}

function revalidateWorkshops() {
	revalidatePath("/");
	revalidatePath("/workshops");
	revalidatePath("/admin/workshops");
}

/** Validate and commit all editable artwork fields in one atomic update. */
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
): Promise<void> {
	await requireMaintainer();
	const title = fields.title.trim();
	const style = fields.style.trim();
	const medium = fields.medium.trim();
	if (!title || !style || !medium) {
		throw new Error("Title, category, and medium are required.");
	}
	if (fields.year !== null && (!Number.isInteger(fields.year) || fields.year <= 0)) {
		throw new Error("Year must be a positive whole number.");
	}
	if (fields.priceInr !== null && (!Number.isInteger(fields.priceInr) || fields.priceInr <= 0)) {
		throw new Error("Price must be a positive whole number.");
	}
	if (!ARTWORK_STATUSES.has(fields.status)) {
		throw new Error("Choose a valid artwork status.");
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
	if (updated.length === 0) throw new Error("Artwork not found.");
	revalidateCatalog(slug);
}

/** Replace an artwork image using a new key, then retire the old variants. */
export async function replaceArtworkImage(slug: string, formData: FormData): Promise<void> {
	await requireMaintainer();
	const [row] = await db
		.select({ image: artworks.image })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (!row) throw new Error("Artwork not found.");

	const file = formData.get("image");
	if (!(file instanceof File) || file.size === 0) throw new Error("An image file is required.");
	const buffer = await readImageUpload(file);
	const nextImageKey = `${slug}-${randomUUID()}`;
	const { aspectRatio, palette } = await processArtworkImage(nextImageKey, buffer);
	try {
		const updated = await db
			.update(artworks)
			.set({
				image: `${nextImageKey}.jpg`,
				aspectRatio,
				palette: palette.length > 0 ? palette : null,
			})
			.where(eq(artworks.slug, slug))
			.returning({ slug: artworks.slug });
		if (updated.length === 0) throw new Error("Artwork no longer exists.");
	} catch (error) {
		await deleteArtworkImages(nextImageKey).catch(() => {});
		throw error;
	}

	await deleteArtworkImages(artworkImageKey(row.image)).catch((error) => {
		console.error("Artwork image cleanup failed after replacement.", error);
	});
	revalidateCatalog(slug);
}

/** Create a new artwork from an uploaded image + metadata (FormData). */
export async function createArtwork(formData: FormData): Promise<{ slug: string }> {
	await requireMaintainer();

	const title = formString(formData, "title").trim();
	const style = formString(formData, "style").trim();
	const medium = formString(formData, "medium").trim();
	const file = formData.get("image");

	if (!title || !style || !medium) throw new Error("Title, style, and medium are required.");
	if (!(file instanceof File) || file.size === 0) throw new Error("An image file is required.");

	const slug = slugify(title);
	if (!slug) throw new Error("Title must contain letters or numbers.");

	const existing = await db
		.select({ slug: artworks.slug })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (existing.length > 0) throw new Error(`An artwork with slug "${slug}" already exists.`);

	const priceRaw = formData.get("priceInr");
	const priceInr = typeof priceRaw === "string" && priceRaw.trim() ? Number(priceRaw) : null;
	const yearRaw = formData.get("year");
	const year = typeof yearRaw === "string" && yearRaw.trim() ? Number(yearRaw) : null;
	if (priceInr !== null && (!Number.isInteger(priceInr) || priceInr <= 0)) {
		throw new Error("Price must be a positive whole number.");
	}
	if (year !== null && (!Number.isInteger(year) || year <= 0)) {
		throw new Error("Year must be a positive whole number.");
	}

	const buffer = await readImageUpload(file);
	const { aspectRatio, palette } = await processArtworkImage(slug, buffer);

	try {
		await db.insert(artworks).values({
			slug,
			title,
			style,
			medium,
			image: `${slug}.jpg`,
			aspectRatio,
			// Computed in the INSERT to avoid an extra application round-trip.
			// Read queries include a stable secondary key for concurrent ties.
			order: nextOrderSql(artworks),
			featured: false,
			description: formString(formData, "description").trim() || null,
			dimensions: formString(formData, "dimensions").trim() || null,
			year,
			palette: palette.length > 0 ? palette : null,
			priceInr,
			status: priceInr ? "available" : "archive",
		});
	} catch (err) {
		// The variants were already uploaded; if the row insert fails (concurrent
		// duplicate slug, network), remove them so R2 doesn't accumulate orphans.
		await deleteArtworkImages(slug).catch(() => {});
		throw err;
	}

	revalidateCatalog(slug);
	return { slug };
}

/** Re-sample the palette for a piece from its stored master image in R2. */
export async function regeneratePalette(slug: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db
		.select({ image: artworks.image })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (!row) throw new Error("Artwork not found.");
	const res = await fetch(`${R2_ARTWORK_IMAGE_BASE}/${artworkImageKey(row.image)}.jpg`);
	if (!res.ok) throw new Error("Could not fetch the master image.");
	const buffer = Buffer.from(await res.arrayBuffer());
	const palette = await extractPalette(buffer);
	await db
		.update(artworks)
		.set({ palette: palette.length > 0 ? palette : null })
		.where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/** Reorder artworks by providing the new slug sequence. */
export async function reorderArtworks(slugs: string[]): Promise<void> {
	await requireMaintainer();
	const queries = slugs.map((slug, i) =>
		db
			.update(artworks)
			.set({ order: i + 1 })
			.where(eq(artworks.slug, slug)),
	);
	if (queries.length > 0) {
		await db.batch(queries as [(typeof queries)[number], ...Array<(typeof queries)[number]>]);
	}
	revalidateCatalog();
}

/** Delete an artwork row + all its R2 image variants. */
export async function deleteArtwork(slug: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db
		.select({ image: artworks.image })
		.from(artworks)
		.where(eq(artworks.slug, slug));
	if (!row) return;
	await db.delete(artworks).where(eq(artworks.slug, slug));
	await deleteArtworkImages(artworkImageKey(row.image)).catch((error) => {
		console.error("Artwork image cleanup failed after deletion.", error);
	});
	revalidateCatalog(slug);
}

// --- Workshop actions ---

/** Create a workshop from form fields. */
export async function createWorkshop(formData: FormData): Promise<{ slug: string }> {
	await requireMaintainer();

	const title = formString(formData, "title").trim();
	const blurb = formString(formData, "blurb").trim();
	if (!title || !blurb) throw new Error("Title and blurb are required.");

	const slug = slugify(title);
	if (!slug) throw new Error("Title must contain letters or numbers.");

	const existing = await db
		.select({ slug: workshops.slug })
		.from(workshops)
		.where(eq(workshops.slug, slug));
	if (existing.length > 0) throw new Error(`A workshop with slug "${slug}" already exists.`);

	const durationRaw = formString(formData, "durationHours");
	const durationHours = durationRaw ? Number(durationRaw) : null;
	if (durationHours !== null && (!Number.isFinite(durationHours) || durationHours <= 0)) {
		throw new Error("Duration must be a positive number.");
	}

	await db.insert(workshops).values({
		slug,
		title,
		blurb,
		durationHours,
		order: nextOrderSql(workshops),
	});

	revalidateWorkshops();
	return { slug };
}

/** Update a workshop's editable fields. */
export async function updateWorkshop(
	slug: string,
	fields: { title?: string; blurb?: string; durationHours?: number | null },
): Promise<void> {
	await requireMaintainer();
	await db.update(workshops).set(fields).where(eq(workshops.slug, slug));
	revalidateWorkshops();
}

/** Reorder workshops by providing the new slug sequence. */
export async function reorderWorkshops(slugs: string[]): Promise<void> {
	await requireMaintainer();
	const queries = slugs.map((slug, i) =>
		db
			.update(workshops)
			.set({ order: i + 1 })
			.where(eq(workshops.slug, slug)),
	);
	if (queries.length > 0) {
		await db.batch(queries as [(typeof queries)[number], ...Array<(typeof queries)[number]>]);
	}
	revalidateWorkshops();
}

/** Delete a workshop. */
export async function deleteWorkshop(slug: string): Promise<void> {
	await requireMaintainer();
	await db.delete(workshops).where(eq(workshops.slug, slug));
	revalidateWorkshops();
}

// --- Custom-order preset actions ---

function revalidateOrderPresets() {
	revalidatePath("/custom-orders");
	revalidatePath("/admin/presets");
}

/** Add a preset option of a given kind (size / budget / timeline). */
export async function createOrderPreset(kind: OrderPresetKind, label: string): Promise<void> {
	await requireMaintainer();
	const trimmed = label.trim();
	if (!trimmed) throw new Error("Label is required.");
	const orderRows = await db.select({ order: orderPresets.order }).from(orderPresets);
	const nextOrder = getNextOrder(orderRows);
	// id must be stable + unique; derive from kind + a monotonic suffix.
	const id = `${kind}-${nextOrder}-${trimmed
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.slice(0, 24)}`;
	await db.insert(orderPresets).values({ id, kind, label: trimmed, order: nextOrder });
	revalidateOrderPresets();
}

/** Rename a preset. */
export async function updateOrderPreset(id: string, label: string): Promise<void> {
	await requireMaintainer();
	const trimmed = label.trim();
	if (!trimmed) throw new Error("Label is required.");
	await db.update(orderPresets).set({ label: trimmed }).where(eq(orderPresets.id, id));
	revalidateOrderPresets();
}

/** Reorder presets within a kind by providing the new id sequence. */
export async function reorderOrderPresets(ids: string[]): Promise<void> {
	await requireMaintainer();
	const queries = ids.map((id, i) =>
		db
			.update(orderPresets)
			.set({ order: i + 1 })
			.where(eq(orderPresets.id, id)),
	);
	if (queries.length > 0) {
		await db.batch(queries as [(typeof queries)[number], ...Array<(typeof queries)[number]>]);
	}
	revalidateOrderPresets();
}

/** Delete a preset. */
export async function deleteOrderPreset(id: string): Promise<void> {
	await requireMaintainer();
	await db.delete(orderPresets).where(eq(orderPresets.id, id));
	revalidateOrderPresets();
}

// --- Category actions ---

function revalidateCategories() {
	revalidatePath("/");
	revalidatePath("/work");
	revalidatePath("/custom-orders");
	revalidatePath("/admin");
	revalidatePath("/admin/categories");
}

/** Add a new art category. */
export async function createCategory(name: string): Promise<void> {
	await requireMaintainer();
	const trimmed = name.trim();
	if (!trimmed) throw new Error("Category name is required.");
	const id = slugify(trimmed);
	if (!id) throw new Error("Name must contain letters or numbers.");
	const existing = await db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, id));
	if (existing.length > 0) throw new Error(`A category like "${trimmed}" already exists.`);
	await db.insert(categories).values({ id, name: trimmed, order: nextOrderSql(categories) });
	revalidateCategories();
}

/**
 * Rename a category. Also updates every artwork whose `style` matches the old
 * name, so renaming never orphans rows (artworks store the name, not the id).
 */
export async function renameCategory(id: string, name: string): Promise<void> {
	await requireMaintainer();
	const trimmed = name.trim();
	if (!trimmed) throw new Error("Category name is required.");
	const [row] = await db.select().from(categories).where(eq(categories.id, id));
	if (!row) throw new Error("Category not found.");
	if (row.name === trimmed) return;
	await db.batch([
		db.update(categories).set({ name: trimmed }).where(eq(categories.id, id)),
		db.update(artworks).set({ style: trimmed }).where(eq(artworks.style, row.name)),
	]);
	revalidateCategories();
}

/** Reorder categories by providing the new id sequence. */
export async function reorderCategories(ids: string[]): Promise<void> {
	await requireMaintainer();
	const queries = ids.map((id, i) =>
		db
			.update(categories)
			.set({ order: i + 1 })
			.where(eq(categories.id, id)),
	);
	if (queries.length > 0) {
		await db.batch(queries as [(typeof queries)[number], ...Array<(typeof queries)[number]>]);
	}
	revalidateCategories();
}

/**
 * Delete a category. Blocked if any artwork still uses it -- the maintainer
 * must reassign those pieces first, so we never leave artworks pointing at a
 * category that no longer exists in the picker.
 */
export async function deleteCategory(id: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(categories).where(eq(categories.id, id));
	if (!row) return;
	const inUse = await db
		.select({ slug: artworks.slug })
		.from(artworks)
		.where(eq(artworks.style, row.name));
	if (inUse.length > 0) {
		throw new Error(
			`"${row.name}" is used by ${inUse.length} piece${inUse.length === 1 ? "" : "s"}. Reassign them first.`,
		);
	}
	await db.delete(categories).where(eq(categories.id, id));
	revalidateCategories();
}

// --- Maintainer roster actions ---

export async function inviteMaintainer(email: string, name?: string): Promise<void> {
	const by = await requireMaintainer();
	await addMaintainer(email, by, name);
	revalidatePath("/admin/maintainers");
}

export async function revokeMaintainer(email: string): Promise<void> {
	await requireMaintainer();
	await removeMaintainer(email); // throws if root
	revalidatePath("/admin/maintainers");
}
