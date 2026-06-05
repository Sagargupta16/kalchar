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
import { artworks } from "@/lib/db/schema";
import { addMaintainer, isMaintainer, removeMaintainer } from "@/lib/maintainers";
import { deleteArtworkImages, processArtworkImage } from "@/lib/storage/process-artwork-image";

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
	const { aspectRatio } = await processArtworkImage(slug, buffer);

	const priceRaw = formData.get("priceInr");
	const priceInr = priceRaw ? Number(priceRaw) : null;
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
		priceInr: priceInr && !Number.isNaN(priceInr) ? priceInr : null,
		status: priceInr && !Number.isNaN(priceInr) ? "available" : "archive",
	});

	revalidateCatalog(slug);
	return { slug };
}

/** Delete an artwork row + all its R2 image variants. */
export async function deleteArtwork(slug: string): Promise<void> {
	await requireMaintainer();
	await db.delete(artworks).where(eq(artworks.slug, slug));
	await deleteArtworkImages(slug);
	revalidateCatalog(slug);
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
