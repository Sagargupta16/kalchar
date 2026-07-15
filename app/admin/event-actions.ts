"use server";

/**
 * Admin server actions for events + the artist-profile settings. Split out of
 * actions.ts to keep both modules under the file-size ceiling. Every action
 * re-checks the maintainer session (defense in depth) before mutating, and
 * revalidates the affected paths so the public site + admin lists update.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { events, settings } from "@/lib/db/schema";
import { readImageUpload } from "@/lib/storage/image-upload";
import {
	deleteEventImages,
	processEventImage,
	processImageVariants,
} from "@/lib/storage/process-artwork-image";
import { formString, nextOrderSql, requireMaintainer } from "./_helpers";

// --- Event actions ---

function revalidateEvents(id?: string) {
	revalidatePath("/");
	revalidatePath("/events");
	revalidatePath("/admin/events");
	if (id) revalidatePath(`/events/${id}`);
}

/** Read every "image" file from FormData (the multi-file picker uses one name). */
function formImages(formData: FormData): File[] {
	const files = formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
	if (files.length > 12) throw new Error("Upload at most 12 images at a time.");
	return files;
}

/** Process one uploaded photo for an event, returning its stored R2 key-base. */
async function uploadEventPhoto(eventId: string, file: File): Promise<string> {
	const buffer = await readImageUpload(file);
	return processEventImage(eventId, randomUUID(), buffer);
}

/** Parse the "eventDate" field into a Date, defaulting to now on a bad value. */
function parseEventDate(formData: FormData): Date {
	const raw = formString(formData, "eventDate").trim();
	const parsed = raw ? new Date(raw) : new Date();
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Create an event from form fields + a batch of uploaded photos. */
export async function createEvent(formData: FormData): Promise<{ id: string }> {
	await requireMaintainer();

	const title = formString(formData, "title").trim();
	if (!title) throw new Error("Title is required.");

	const id = randomUUID();
	const files = formImages(formData);
	// Upload sequentially so a partial failure leaves a contiguous set, and the
	// stored order matches the order the maintainer picked them.
	const images: string[] = [];
	try {
		for (const file of files) {
			images.push(await uploadEventPhoto(id, file));
		}

		await db.insert(events).values({
			id,
			title,
			description: formString(formData, "description").trim() || null,
			eventDate: parseEventDate(formData),
			category: formString(formData, "category").trim() || null,
			images,
			featured: false,
			// Computed in the INSERT to avoid an extra application round-trip.
			order: nextOrderSql(events),
		});
	} catch (err) {
		// Photos already uploaded for this event are unreferenced if the insert
		// (or a later upload) fails -- remove them so R2 doesn't accumulate orphans.
		if (images.length > 0) await deleteEventImages(images).catch(() => {});
		throw err;
	}

	revalidateEvents(id);
	return { id };
}

/** Update an event's editable text fields (title, description, date, category). */
export async function updateEventMeta(
	id: string,
	fields: {
		title?: string;
		description?: string | null;
		eventDate?: string;
		category?: string | null;
	},
): Promise<void> {
	await requireMaintainer();
	const patch: Partial<typeof events.$inferInsert> = {
		title: fields.title,
		description: fields.description,
		category: fields.category,
	};
	if (fields.eventDate) {
		const parsed = new Date(fields.eventDate);
		if (!Number.isNaN(parsed.getTime())) patch.eventDate = parsed;
	}
	await db.update(events).set(patch).where(eq(events.id, id));
	revalidateEvents(id);
}

/** Add more photos to an existing event (appended after the current set). */
export async function addEventImages(id: string, formData: FormData): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) throw new Error("Event not found.");
	const added: string[] = [];
	try {
		for (const file of formImages(formData)) {
			added.push(await uploadEventPhoto(id, file));
		}
		if (added.length === 0) return;
		await db
			.update(events)
			.set({ images: [...(row.images ?? []), ...added] })
			.where(eq(events.id, id));
	} catch (err) {
		if (added.length > 0) await deleteEventImages(added).catch(() => {});
		throw err;
	}
	revalidateEvents(id);
}

/** Remove one photo from an event (drops the row reference + its R2 variants). */
export async function removeEventImage(id: string, keyBase: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) throw new Error("Event not found.");
	const current = row.images ?? [];
	if (!current.includes(keyBase)) throw new Error("Event image not found.");
	const next = current.filter((k) => k !== keyBase);
	await db.update(events).set({ images: next }).where(eq(events.id, id));
	await deleteEventImages([keyBase]).catch((error) => {
		console.error("Event image cleanup failed after removal.", error);
	});
	revalidateEvents(id);
}

/** Reorder an event's photos by providing the new key-base sequence. */
export async function reorderEventImages(id: string, keyBases: string[]): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) throw new Error("Event not found.");
	const current = row.images ?? [];
	const owned = new Set(current);
	const requested = new Set(keyBases);
	const isExactPermutation =
		keyBases.length === current.length &&
		requested.size === current.length &&
		keyBases.every((keyBase) => owned.has(keyBase));
	if (!isExactPermutation) throw new Error("Photo list changed. Refresh and try again.");
	await db.update(events).set({ images: keyBases }).where(eq(events.id, id));
	revalidateEvents(id);
}

/**
 * Pin/unpin an event. Stored in the `featured` column; the seam sorts pinned
 * events to the top (ahead of the date-desc order), and the home strip prefers
 * them. "Featured" and "pinned" are the same flag.
 */
export async function setEventFeatured(id: string, featured: boolean): Promise<void> {
	await requireMaintainer();
	await db.update(events).set({ featured }).where(eq(events.id, id));
	revalidateEvents(id);
}

/** Delete an event row + all its R2 image variants. */
export async function deleteEvent(id: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) return;
	await db.delete(events).where(eq(events.id, id));
	await deleteEventImages(row.images ?? []).catch((error) => {
		console.error("Event image cleanup failed after deletion.", error);
	});
	revalidateEvents(id);
}

// --- Settings actions (artist profile) ---

function revalidateProfile() {
	revalidatePath("/");
	revalidatePath("/about");
	revalidatePath("/admin/profile");
}

/** Upload (or replace) the artist profile photo; stores its R2 key-base. */
export async function setProfileImage(formData: FormData): Promise<void> {
	await requireMaintainer();
	const file = formData.get("image");
	if (!(file instanceof File) || file.size === 0) throw new Error("An image file is required.");
	const buffer = await readImageUpload(file);
	const [current] = await db.select().from(settings).where(eq(settings.key, "profileImage"));
	const oldKeyBase = typeof current?.value === "string" ? current.value : undefined;
	const keyBase = `profile/artist-${randomUUID()}`;
	await processImageVariants(keyBase, buffer);
	try {
		await db
			.insert(settings)
			.values({ key: "profileImage", value: keyBase })
			.onConflictDoUpdate({ target: settings.key, set: { value: keyBase } });
	} catch (error) {
		await deleteEventImages([keyBase]).catch(() => {});
		throw error;
	}
	if (oldKeyBase) {
		await deleteEventImages([oldKeyBase]).catch((error) => {
			console.error("Profile image cleanup failed after replacement.", error);
		});
	}
	revalidateProfile();
}

/** Remove the artist profile photo (reverts About to the monogram fallback). */
export async function clearProfileImage(): Promise<void> {
	await requireMaintainer();
	const [current] = await db.select().from(settings).where(eq(settings.key, "profileImage"));
	const keyBase = typeof current?.value === "string" ? current.value : "profile/artist";
	await db.delete(settings).where(eq(settings.key, "profileImage"));
	await deleteEventImages([keyBase]).catch((error) => {
		console.error("Profile image cleanup failed after removal.", error);
	});
	revalidateProfile();
}

/** Toggle whether the short artist intro shows on the home page. */
export async function setShowHomeIntro(show: boolean): Promise<void> {
	await requireMaintainer();
	await db
		.insert(settings)
		.values({ key: "showHomeIntro", value: show })
		.onConflictDoUpdate({ target: settings.key, set: { value: show } });
	revalidateProfile();
}
