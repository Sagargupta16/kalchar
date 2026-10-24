import { describe, expect, it } from "vitest";
import {
	parseTestimonialDraft,
	TESTIMONIAL_LIMITS,
	type TestimonialDraft,
	testimonialDraftFromForm,
} from "./testimonial-fields";

const draft = (over: Partial<TestimonialDraft> = {}): TestimonialDraft => ({
	quote: "  A treasured piece.  ",
	authorName: " Priya ",
	authorLocation: " Pune ",
	artworkSlug: " lotus ",
	...over,
});

describe("parseTestimonialDraft", () => {
	it("trims every field", () => {
		expect(parseTestimonialDraft(draft())).toEqual({
			fields: {
				quote: "A treasured piece.",
				authorName: "Priya",
				authorLocation: "Pune",
				artworkSlug: "lotus",
			},
		});
	});

	it("turns blank optional fields into null", () => {
		const parsed = parseTestimonialDraft(draft({ authorLocation: "  ", artworkSlug: "" }));
		expect(parsed).toMatchObject({ fields: { authorLocation: null, artworkSlug: null } });
	});

	it.each([
		["quote", { quote: "   " }, "Quote is required."],
		["authorName", { authorName: "" }, "Author name is required."],
	] as const)("requires the %s", (field, over, message) => {
		expect(parseTestimonialDraft(draft(over))).toEqual({ error: { field, message } });
	});

	it.each([
		["quote", TESTIMONIAL_LIMITS.quote],
		["authorName", TESTIMONIAL_LIMITS.authorName],
		["authorLocation", TESTIMONIAL_LIMITS.authorLocation],
	] as const)("accepts %s at its limit and refuses one character more", (field, limit) => {
		expect(parseTestimonialDraft(draft({ [field]: "a".repeat(limit) }))).toHaveProperty("fields");
		expect(parseTestimonialDraft(draft({ [field]: "a".repeat(limit + 1) }))).toMatchObject({
			error: { field },
		});
	});

	it("refuses an artwork link no slug could be", () => {
		expect(parseTestimonialDraft(draft({ artworkSlug: "a".repeat(65) }))).toEqual({
			error: { field: "artworkSlug", message: "Choose a piece from the list." },
		});
	});
});

describe("testimonialDraftFromForm", () => {
	it("reads the four text fields and defaults missing ones to empty", () => {
		const formData = new FormData();
		formData.set("quote", "Lovely");
		formData.set("authorName", "Mira");
		expect(testimonialDraftFromForm(formData)).toEqual({
			quote: "Lovely",
			authorName: "Mira",
			authorLocation: "",
			artworkSlug: "",
		});
	});
});
