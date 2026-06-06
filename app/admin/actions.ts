"use server";

import { eq } from "drizzle-orm";
/**
 * Admin server actions. Every action re-checks the session (defense in depth --
 * the proxy already gates /admin, but actions can be invoked directly) and
 * confirms the caller is a maintainer before mutating.
 *
 * Artwork mutations touch both the DB row and the R2 image variants; maintainer
 * mutations touch the roster. All revalidate the affected paths so the public
 * gallery and the admin list reflect changes immediately.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { artworks, workshops } from "@/lib/db/schema";
import { addMaintainer, isMaintainer, removeMaintainer } from "@/lib/maintainers";
import {
	deleteArtworkImages,
	extractPalette,
	processArtworkImage,
} from "@/lib/storage/process-artwork-image";

async function requireMaintainer(): Promise<string> {
	const session = await auth();
	const email = session?.user?.email;
	if (!email || !(await isMaintainer(email))) {
		throw new Error("Not authorized.");
	}
	return email.toLowerCase();
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function revalidateCatalog(slug?: string) {
	revalidatePath("/");
	revalidatePath("/work");
	revalidatePath("/admin");
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

/** Update free-text metadata fields. */
export async function updateArtworkMeta(
	slug: string,
	fields: {
		title?: string;
		description?: string;
		medium?: string;
		dimensions?: string;
		year?: number | null;
	},
): Promise<void> {
	await requireMaintainer();
	await db.update(artworks).set(fields).where(eq(artworks.slug, slug));
	revalidateCatalog(slug);
}

/** Create a new artwork from an uploaded image + metadata (FormData). */
export async function createArtwork(formData: FormData): Promise<{ slug: string }> {
	await requireMaintainer();

	const str = (k: string) => {
		const v = formData.get(k);
		return typeof v === "string" ? v : "";
	};

	const title = str("title").trim();
	const style = str("style").trim();
	const medium = str("medium").trim();
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
	const maxOrderRow = await db.select({ order: artworks.order }).from(artworks);
	const nextOrder = maxOrderRow.reduce((m, r) => Math.max(m, r.order), 0) + 1;

	await db.insert(artworks).values({
		slug,
		title,
		style,
		medium,
		image: `${slug}.jpg`,
		aspectRatio,
		order: nextOrder,
		featured: false,
		description: str("description").trim() || null,
		dimensions: str("dimensions").trim() || null,
		year: year && !Number.isNaN(year) ? year : null,
		palette: palette.length > 0 ? palette : null,
		priceInr: priceInr && !Number.isNaN(priceInr) ? priceInr : null,
		status: priceInr && !Number.isNaN(priceInr) ? "available" : "archive",
	});

	revalidateCatalog(slug);
	return { slug };
}

/** Re-sample the palette for a piece from its stored master image in R2. */
export async function regeneratePalette(slug: string): Promise<void> {
	await requireMaintainer();
	const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "";
	if (!base) throw new Error("Image base URL not configured.");
	const res = await fetch(`${base.replace(/\/$/, "")}/artworks/${slug}.jpg`);
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
	const str = (k: string) => {
		const v = formData.get(k);
		return typeof v === "string" ? v : "";
	};

	const title = str("title").trim();
	const blurb = str("blurb").trim();
	if (!title || !blurb) throw new Error("Title and blurb are required.");

	const slug = slugify(title);
	if (!slug) throw new Error("Title must contain letters or numbers.");

	const existing = await db
		.select({ slug: workshops.slug })
		.from(workshops)
		.where(eq(workshops.slug, slug));
	if (existing.length > 0) throw new Error(`A workshop with slug "${slug}" already exists.`);

	const durationRaw = str("durationHours");
	const durationHours = durationRaw ? Number(durationRaw) : null;
	const maxOrderRow = await db.select({ order: workshops.order }).from(workshops);
	const nextOrder = maxOrderRow.reduce((m, r) => Math.max(m, r.order), 0) + 1;

	await db.insert(workshops).values({
		slug,
		title,
		blurb,
		durationHours: durationHours && !Number.isNaN(durationHours) ? durationHours : null,
		order: nextOrder,
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
