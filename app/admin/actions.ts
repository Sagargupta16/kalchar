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
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { artworks, categories, orderPresets, workshops } from "@/lib/db/schema";
import { ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { addMaintainer, removeMaintainer } from "@/lib/maintainers";
import {
	deleteArtworkImages,
	extractPalette,
	processArtworkImage,
} from "@/lib/storage/process-artwork-image";
import type { OrderPresetKind } from "@/lib/types";
import { formString, getNextOrder, nextOrderSql, requireMaintainer, slugify } from "./_helpers";

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

/** Set or clear a piece's price (clearing reverts it to archive via the seam). */
export async function setPrice(slug: string, priceInr: number | null): Promise<void> {
	await requireMaintainer();
	await db
		.update(artworks)
		.set({ priceInr, status: priceInr === null ? "archive" : "available" })
		.where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/** Set lifecycle status explicitly (archive / available / sold). */
export async function setStatus(
	slug: string,
	status: "archive" | "available" | "sold",
): Promise<void> {
	await requireMaintainer();
	await db.update(artworks).set({ status }).where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/** Toggle featured (hero/rail inclusion). */
export async function setFeatured(slug: string, featured: boolean): Promise<void> {
	await requireMaintainer();
	await db.update(artworks).set({ featured }).where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/** Update editable artwork fields (everything except slug, image, order). */
export async function updateArtworkMeta(
	slug: string,
	fields: {
		title?: string;
		style?: string;
		description?: string | null;
		medium?: string;
		dimensions?: string | null;
		year?: number | null;
	},
): Promise<void> {
	await requireMaintainer();
	await db.update(artworks).set(fields).where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/**
 * Replace an artwork's image: re-run the sharp/R2 pipeline for the SAME slug
 * (overwrites the existing variants), refresh the stored aspectRatio + palette.
 * The slug and DB row are unchanged, so URLs and metadata survive.
 */
export async function replaceArtworkImage(slug: string, formData: FormData): Promise<void> {
	await requireMaintainer();
	const file = formData.get("image");
	if (!(file instanceof File) || file.size === 0) throw new Error("An image file is required.");
	const buffer = Buffer.from(await file.arrayBuffer());
	const { aspectRatio, palette } = await processArtworkImage(slug, buffer);
	await db
		.update(artworks)
		.set({ aspectRatio, palette: palette.length > 0 ? palette : null })
		.where(eq(artworks.slug, slug));
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

	const buffer = Buffer.from(await file.arrayBuffer());
	const { aspectRatio, palette } = await processArtworkImage(slug, buffer);

	const priceRaw = formData.get("priceInr");
	const priceInr = priceRaw ? Number(priceRaw) : null;
	const yearRaw = formData.get("year");
	const year = yearRaw ? Number(yearRaw) : null;

	try {
		await db.insert(artworks).values({
			slug,
			title,
			style,
			medium,
			image: `${slug}.jpg`,
			aspectRatio,
			// Computed inside the INSERT so two concurrent creates can't mint the
			// same order (no read-then-write window).
			order: nextOrderSql(artworks),
			featured: false,
			description: formString(formData, "description").trim() || null,
			dimensions: formString(formData, "dimensions").trim() || null,
			year: year && !Number.isNaN(year) ? year : null,
			palette: palette.length > 0 ? palette : null,
			priceInr: priceInr && !Number.isNaN(priceInr) ? priceInr : null,
			status: priceInr && !Number.isNaN(priceInr) ? "available" : "archive",
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
	const res = await fetch(`${ARTWORK_IMAGE_BASE}/${slug}.jpg`);
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
	await Promise.all(
		slugs.map((slug, i) =>
			db
				.update(artworks)
				.set({ order: i + 1 })
				.where(eq(artworks.slug, slug)),
		),
	);
	revalidateCatalog();
}

/** Delete an artwork row + all its R2 image variants. */
export async function deleteArtwork(slug: string): Promise<void> {
	await requireMaintainer();
	await db.delete(artworks).where(eq(artworks.slug, slug));
	await deleteArtworkImages(slug);
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

	await db.insert(workshops).values({
		slug,
		title,
		blurb,
		durationHours: durationHours && !Number.isNaN(durationHours) ? durationHours : null,
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
	await Promise.all(
		slugs.map((slug, i) =>
			db
				.update(workshops)
				.set({ order: i + 1 })
				.where(eq(workshops.slug, slug)),
		),
	);
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
	await Promise.all(
		ids.map((id, i) =>
			db
				.update(orderPresets)
				.set({ order: i + 1 })
				.where(eq(orderPresets.id, id)),
		),
	);
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
	await db.update(categories).set({ name: trimmed }).where(eq(categories.id, id));
	await db.update(artworks).set({ style: trimmed }).where(eq(artworks.style, row.name));
	revalidateCategories();
}

/** Reorder categories by providing the new id sequence. */
export async function reorderCategories(ids: string[]): Promise<void> {
	await requireMaintainer();
	await Promise.all(
		ids.map((id, i) =>
			db
				.update(categories)
				.set({ order: i + 1 })
				.where(eq(categories.id, id)),
		),
	);
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
