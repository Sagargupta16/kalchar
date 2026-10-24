"use server";

/**
 * Admin server actions for testimonials. Split into its own module (like
 * event-actions.ts) to keep each action file under the 500-line ceiling. Every
 * action re-checks the maintainer session before mutating and revalidates the
 * public surfaces (home + the linked artwork page) plus the admin list.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { runAdminAction } from "@/lib/admin-action";
import { db } from "@/lib/db/client";
import { testimonials } from "@/lib/db/schema";
import { revalidateEntity } from "@/lib/revalidate";
import {
	parseTestimonialDraft,
	type TestimonialFields,
	testimonialDraftFromForm,
} from "@/lib/testimonial-fields";
import { formString, nextOrderSql } from "./_helpers";

/** The only entity with row-specific routes: the artwork pages a testimonial belongs to. */
function revalidateTestimonials(...artworkSlugs: ReadonlyArray<string | null | undefined>): void {
	revalidateEntity(
		"testimonials",
		...artworkSlugs.map((slug) => (slug ? `/work/${slug}` : undefined)),
	);
}

/** Trimmed, length-capped quote fields from a create or edit form; throws the first problem. */
function readTestimonialFields(formData: FormData): TestimonialFields {
	const parsed = parseTestimonialDraft(testimonialDraftFromForm(formData));
	if ("error" in parsed) throw new Error(parsed.error.message);
	return parsed.fields;
}

/** Create a testimonial from form fields. */
export async function createTestimonial(formData: FormData): Promise<ActionResult<{ id: string }>> {
	return runAdminAction(async () => {
		const fields = readTestimonialFields(formData);
		const id = randomUUID();
		await db.insert(testimonials).values({
			id,
			...fields,
			featured: formString(formData, "featured") === "on",
			// Computed in the INSERT so concurrent creates can't collide on order.
			order: nextOrderSql(testimonials),
		});
		revalidateTestimonials(fields.artworkSlug);
		return { id };
	});
}

/**
 * Edit a testimonial's quote, author, location and linked piece with the same
 * rules as create. Featured is left alone (the row's star owns it). Both the
 * old and the new artwork pages refresh when the link moves.
 */
export async function updateTestimonial(id: string, formData: FormData): Promise<ActionResult> {
	return runAdminAction(async () => {
		const fields = readTestimonialFields(formData);
		const [before] = await db
			.select({ artworkSlug: testimonials.artworkSlug })
			.from(testimonials)
			.where(eq(testimonials.id, id));
		if (!before) throw new Error("Testimonial not found.");
		await db.update(testimonials).set(fields).where(eq(testimonials.id, id));
		revalidateTestimonials(before.artworkSlug, fields.artworkSlug);
	});
}

/** Toggle whether a testimonial shows on the home page. */
export async function setTestimonialFeatured(id: string, featured: boolean): Promise<ActionResult> {
	return runAdminAction(async () => {
		const [updated] = await db
			.update(testimonials)
			.set({ featured })
			.where(eq(testimonials.id, id))
			.returning({ artworkSlug: testimonials.artworkSlug });
		if (!updated) throw new Error("Testimonial not found.");
		revalidateTestimonials(updated.artworkSlug);
	});
}

/** Delete a testimonial. */
export async function deleteTestimonial(id: string): Promise<ActionResult> {
	return runAdminAction(async () => {
		const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id));
		await db.delete(testimonials).where(eq(testimonials.id, id));
		revalidateTestimonials(row?.artworkSlug);
	});
}
