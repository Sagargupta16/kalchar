/**
 * One validation for a testimonial's text fields, shared by the create and
 * update server actions and the inline row editor, so a quote the editor
 * accepts is never refused by the server for a different reason.
 */
import { formString, SLUG_MAX_LENGTH } from "./admin-helpers";

/** Generous for a real quote, tight enough to keep a card readable and bound abuse. */
export const TESTIMONIAL_LIMITS = {
	quote: 1000,
	authorName: 100,
	authorLocation: 100,
} as const;

export interface TestimonialDraft {
	quote: string;
	authorName: string;
	authorLocation: string;
	artworkSlug: string;
}

export interface TestimonialFields {
	quote: string;
	authorName: string;
	authorLocation: string | null;
	artworkSlug: string | null;
}

export interface TestimonialDraftError {
	field: keyof TestimonialDraft;
	message: string;
}

/** Read the four text fields from a submitted form ("" for anything missing). */
export function testimonialDraftFromForm(formData: FormData): TestimonialDraft {
	return {
		quote: formString(formData, "quote"),
		authorName: formString(formData, "authorName"),
		authorLocation: formString(formData, "authorLocation"),
		artworkSlug: formString(formData, "artworkSlug"),
	};
}

/** Trim, require the quote and name, cap every length; optional fields become null when blank. */
export function parseTestimonialDraft(
	draft: TestimonialDraft,
): { error: TestimonialDraftError } | { fields: TestimonialFields } {
	const quote = draft.quote.trim();
	const authorName = draft.authorName.trim();
	const authorLocation = draft.authorLocation.trim();
	const artworkSlug = draft.artworkSlug.trim();
	if (!quote) return { error: { field: "quote", message: "Quote is required." } };
	if (quote.length > TESTIMONIAL_LIMITS.quote) {
		return {
			error: {
				field: "quote",
				message: `The quote can be up to ${TESTIMONIAL_LIMITS.quote} characters.`,
			},
		};
	}
	if (!authorName) return { error: { field: "authorName", message: "Author name is required." } };
	if (authorName.length > TESTIMONIAL_LIMITS.authorName) {
		return {
			error: {
				field: "authorName",
				message: `The name can be up to ${TESTIMONIAL_LIMITS.authorName} characters.`,
			},
		};
	}
	if (authorLocation.length > TESTIMONIAL_LIMITS.authorLocation) {
		return {
			error: {
				field: "authorLocation",
				message: `The location can be up to ${TESTIMONIAL_LIMITS.authorLocation} characters.`,
			},
		};
	}
	if (artworkSlug.length > SLUG_MAX_LENGTH) {
		return { error: { field: "artworkSlug", message: "Choose a piece from the list." } };
	}
	return {
		fields: {
			quote,
			authorName,
			authorLocation: authorLocation || null,
			artworkSlug: artworkSlug || null,
		},
	};
}
