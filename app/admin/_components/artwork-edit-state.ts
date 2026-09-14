import type { Artwork } from "@/lib/types";

/**
 * The editor's field state: strings as typed, so the dirty check is a plain
 * comparison. Status and Featured are NOT here: they apply immediately with
 * optimistic UI and the Undo toast (D37), independent of Save (Tier 1d).
 */
export interface EditorFields {
	title: string;
	style: string;
	medium: string;
	dimensions: string;
	year: string;
	description: string;
	price: string;
}

export type FieldErrors = Partial<Record<"title" | "style" | "medium" | "price" | "year", string>>;

export function fieldsFromArtwork(art: Artwork): EditorFields {
	return {
		title: art.title,
		style: art.style,
		medium: art.medium,
		dimensions: art.dimensions ?? "",
		year: art.year?.toString() ?? "",
		description: art.description ?? "",
		price: art.priceInr?.toString() ?? "",
	};
}

export function sameFields(a: EditorFields, b: EditorFields): boolean {
	return (Object.keys(a) as (keyof EditorFields)[]).every((key) => a[key] === b[key]);
}

const MIN_YEAR = 1900;

/** Client-side required and range checks; the server stays the backstop. */
export function validateFields(fields: EditorFields): FieldErrors {
	const errors: FieldErrors = {};
	const maxYear = new Date().getFullYear() + 1;
	if (!fields.title.trim()) errors.title = "Enter a title";
	if (!fields.style) errors.style = "Choose a category";
	if (!fields.medium.trim()) errors.medium = "Enter a medium";
	if (fields.price !== "" && !/^\d+$/.test(fields.price)) {
		errors.price = "Price must be a whole number";
	}
	if (fields.year !== "") {
		const year = Number(fields.year);
		if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear) {
			errors.year = `Year must be between ${MIN_YEAR} and ${maxYear}`;
		}
	}
	return errors;
}

/**
 * The payload updateArtwork expects. The action requires status and featured;
 * they ride along from the live (optimistically patched) artwork, never from
 * the form.
 */
export function parseFields(fields: EditorFields, current: Artwork) {
	return {
		title: fields.title.trim(),
		style: fields.style,
		medium: fields.medium.trim(),
		dimensions: fields.dimensions.trim() || null,
		year: fields.year ? Number(fields.year) : null,
		description: fields.description.trim() || null,
		priceInr: fields.price === "" ? null : Number(fields.price),
		status: current.status ?? "archive",
		featured: current.featured,
	};
}
