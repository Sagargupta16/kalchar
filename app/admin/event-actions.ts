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
import {
	deleteEventImages,
	processEventImage,
	processImageVariants,
} from "@/lib/storage/process-artwork-image";
import { formString, getNextOrder, requireMaintainer } from "./_helpers";

// --- Event actions ---

function revalidateEvents(id?: string) {
	revalidatePath("/");
	revalidatePath("/events");
	revalidatePath("/admin/events");
	if (id) revalidatePath(`/events/${id}`);
}

/** Read every "image" file from FormData (the multi-file picker uses one name). */
function formImages(formData: FormData): File[] {
	return formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
}

/** Process one uploaded photo for an event, returning its stored R2 key-base. */
async function uploadEventPhoto(eventId: string, file: File): Promise<string> {
	const buffer = Buffer.from(await file.arrayBuffer());
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
	for (const file of files) {
		images.push(await uploadEventPhoto(id, file));
	}

	const orderRows = await db.select({ order: events.order }).from(events);
	await db.insert(events).values({
		id,
		title,
		description: formString(formData, "description").trim() || null,
		eventDate: parseEventDate(formData),
		category: formString(formData, "category").trim() || null,
		images,
		featured: false,
		order: getNextOrder(orderRows),
	});

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
	for (const file of formImages(formData)) {
		added.push(await uploadEventPhoto(id, file));
	}
	if (added.length === 0) return;
	await db
		.update(events)
		.set({ images: [...(row.images ?? []), ...added] })
		.where(eq(events.id, id));
	revalidateEvents(id);
}

/** Remove one photo from an event (drops the row reference + its R2 variants). */
export async function removeEventImage(id: string, keyBase: string): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) throw new Error("Event not found.");
	const next = (row.images ?? []).filter((k) => k !== keyBase);
	await db.update(events).set({ images: next }).where(eq(events.id, id));
	await deleteEventImages([keyBase]);
	revalidateEvents(id);
}

/** Reorder an event's photos by providing the new key-base sequence. */
export async function reorderEventImages(id: string, keyBases: string[]): Promise<void> {
	await requireMaintainer();
	const [row] = await db.select().from(events).where(eq(events.id, id));
	if (!row) throw new Error("Event not found.");
	// Keep only key-bases that still belong to this event (guard against a stale
	// client list), preserving the order the client sent.
	const owned = new Set(row.images ?? []);
	const next = keyBases.filter((k) => owned.has(k));
	await db.update(events).set({ images: next }).where(eq(events.id, id));
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
	await deleteEventImages(row.images ?? []);
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
	const buffer = Buffer.from(await file.arrayBuffer());
	// Stable key so a re-upload overwrites the same variants (no orphans).
	const keyBase = "profile/artist";
	await processImageVariants(keyBase, buffer);
	await db
		.insert(settings)
		.values({ key: "profileImage", value: keyBase })
		.onConflictDoUpdate({ target: settings.key, set: { value: keyBase } });
	revalidateProfile();
}

/** Remove the artist profile photo (reverts About to the monogram fallback). */
export async function clearProfileImage(): Promise<void> {
	await requireMaintainer();
	await deleteEventImages(["profile/artist"]);
	await db.delete(settings).where(eq(settings.key, "profileImage"));
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
