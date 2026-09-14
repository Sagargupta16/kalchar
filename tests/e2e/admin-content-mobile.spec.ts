import { devices, expect, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

// Pixel 7 with touch so pointer: coarse is true and the shell's Move buttons
// render on the preview server. The CSS-less harness has no Tailwind, so its
// cases assert DOM, ARIA, calls and copy, never geometry. Titles carry @mobile
// so the root desktop-chromium project skips this file via its grepInvert.
test.use({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, hasTouch: true });

const fixtureImage = (name: string) => ({
	name,
	mimeType: "image/jpeg",
	buffer: Buffer.from(`admin content fixture ${name}`),
});

test.describe("admin content @mobile", () => {
	test("events: collapsed by default, one primary, panel opens with focus", async ({ page }) => {
		await mountAdmin(page, "events");
		await expect(page.getByRole("textbox", { name: "Title *" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Add event", exact: true })).toHaveCount(1);
		await page.getByRole("button", { name: "Add event" }).click();
		await expect(page.getByRole("textbox", { name: "Title *" })).toBeFocused();
		const form = page.locator("form");
		const heading = form.getByRole("heading", { level: 2, name: "Add an event" });
		await expect(heading).toBeVisible();
		const headingId = await heading.getAttribute("id");
		await expect(form).toHaveAttribute("aria-labelledby", headingId ?? "");
		await expect(form.getByText("Fields marked * are required.")).toBeVisible();
		const today = new Date().toLocaleDateString("en-CA");
		await expect(page.getByLabel("Event date *", { exact: true })).toHaveValue(today);
	});

	test("events: create failure stays in the panel with the draft", async ({ page }) => {
		await mountAdmin(page, "events");
		await page.getByRole("button", { name: "Add event" }).click();
		await page.getByLabel("Title *", { exact: true }).fill("New gathering");
		await page.getByRole("button", { name: "Add event", exact: true }).click();
		await expect(page.locator("form").getByRole("alert")).toHaveText("Change was rejected.");
		await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("New gathering");
		await expect(page.getByRole("alert")).toHaveCount(1);
	});

	test("events: create success closes the panel and names the event", async ({ page }) => {
		await mountAdmin(page, "events");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Add event" }).click();
		await page.getByLabel("Title *", { exact: true }).fill("Monsoon show");
		await page
			.locator('input[name="images"]')
			.setInputFiles([fixtureImage("one.jpg"), fixtureImage("two.jpg")]);
		await page.getByRole("button", { name: "Add event", exact: true }).click();
		await expect(page.getByText('"Monsoon show" added with 2 photos.')).toBeVisible();
		await expect(page.getByRole("link", { name: /View on site/ })).toHaveAttribute(
			"href",
			"/events",
		);
		// The panel is gone and the trigger is back.
		await expect(page.getByRole("textbox", { name: "Title *" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeVisible();
		expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(1);
		const sent = await page.evaluate(() => {
			const call = window.adminTest.calls.find((c) => c.name === "createEvent");
			const fd = call?.args[0] as FormData;
			return { title: fd.get("title"), keyBases: fd.getAll("imageKeyBases").length };
		});
		expect(sent.title).toBe("Monsoon show");
		expect(sent.keyBases).toBe(2);
	});

	test("events: row anatomy and Pin is optimistic and reversible", async ({ page }) => {
		await mountAdmin(page, "events");
		const row = page.getByRole("listitem").first();
		await expect(row.getByRole("button", { name: "Edit Gathering", exact: true })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Close", exact: true })).toHaveCount(0);
		const pin = row.getByRole("button", { name: "Pin Gathering to top", exact: true });
		await expect(pin).toHaveAttribute("aria-pressed", "false");
		await outcome(page, "pending");
		await pin.click();
		await expect(pin).toHaveAttribute("aria-pressed", "true");
		await page.evaluate(() => window.adminTest.release?.());
		await expect(pin).toHaveAttribute("aria-pressed", "true");

		await mountAdmin(page, "events");
		await outcome(page, "failure");
		const failedRow = page.getByRole("listitem").first();
		await failedRow.getByRole("button", { name: "Pin Gathering to top" }).click();
		await expect(
			failedRow.getByRole("button", { name: "Pin Gathering to top" }),
		).toHaveAttribute("aria-pressed", "false");
		await expect(failedRow.getByRole("alert")).toHaveText("Change was rejected.");
		expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(0);
		await expect(failedRow.getByRole("button", { name: "Delete Gathering" })).toBeEnabled();
		await expect(
			page.getByRole("button", { name: "Pin Monsoon exhibition at the community hall to top" }),
		).toBeEnabled();
	});

	test("events: Edit body expands the editor with Details and Photos", async ({ page }) => {
		await mountAdmin(page, "events");
		const body = page.getByRole("button", { name: "Edit Gathering", exact: true });
		await body.click();
		await expect(body).toHaveAttribute("aria-expanded", "true");
		const row = page.getByRole("listitem").first();
		await expect(row.getByRole("heading", { level: 3, name: "Details" })).toBeVisible();
		await expect(row.getByRole("heading", { level: 3, name: "Photos" })).toBeVisible();
		await body.click();
		await expect(body).toHaveAttribute("aria-expanded", "false");
	});

	test("events: Delete uses outcome labels, updates the count, and survives failure", async ({
		page,
	}) => {
		await mountAdmin(page, "events");
		await expect(page.getByRole("heading", { name: "All events (2)" })).toBeVisible();
		await page.getByRole("button", { name: "Delete Gathering" }).click();
		const dialog = page.getByRole("dialog", { name: 'Delete "Gathering"?' });
		await expect(dialog.getByRole("button", { name: "Delete event", exact: true })).toBeVisible();
		await dialog.getByRole("button", { name: "Keep event", exact: true }).click();
		await expect(page.getByRole("button", { name: "Delete Gathering" })).toBeVisible();
		await expect(page.getByRole("alert")).toHaveCount(0);
		await page.getByRole("button", { name: "Delete Gathering" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete event", exact: true }).click();
		await expect(page.getByRole("listitem").first().getByRole("alert")).toHaveText(
			"Change was rejected.",
		);
		await expect(page.getByRole("button", { name: "Delete Gathering" })).toBeVisible();
		await outcome(page, "success");
		await page.getByRole("button", { name: "Delete Gathering" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete event", exact: true }).click();
		await expect(page.getByRole("button", { name: "Delete Gathering" })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "All events (1)" })).toBeVisible();
		await page
			.getByRole("button", { name: "Delete Monsoon exhibition at the community hall" })
			.click();
		await page.getByRole("dialog").getByRole("button", { name: "Delete event", exact: true }).click();
		await expect(page.getByRole("heading", { name: "All events (0)" })).toBeVisible();
		await expect(page.getByText("No events yet")).toBeVisible();
	});

	test("eventImages: Move buttons reorder by touch and Save order persists", async ({ page }) => {
		await mountAdmin(page, "eventImages");
		await expect(page.getByRole("button", { name: "Move photo 1 left", exact: true })).toBeDisabled();
		await page.getByRole("button", { name: "Move photo 1 right", exact: true }).click();
		await expect(page.getByText("photo 1, position 2 of 3", { exact: true })).toBeAttached();
		await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeVisible();
		await outcome(page, "success");
		await page.getByRole("button", { name: "Save order", exact: true }).click();
		const lastCall = (await page.evaluate(() => window.adminTest.calls)).at(-1);
		expect(lastCall?.name).toBe("reorderEventImages");
		expect(lastCall?.args.at(-1)).toEqual(["events/two", "events/one", "events/three"]);
		await expect(page.getByText("Order saved")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
	});

	test("eventImages: Cover moves a photo to first", async ({ page }) => {
		await mountAdmin(page, "eventImages");
		await page.getByRole("button", { name: "Make photo 3 the cover" }).click();
		const firstImage = page.getByRole("listitem").first().locator("img");
		await expect(firstImage).toHaveAttribute("alt", "Cover");
		expect((await firstImage.getAttribute("src"))?.endsWith("events/three-400.webp")).toBe(true);
		await outcome(page, "success");
		await page.getByRole("button", { name: "Save order" }).click();
		const lastCall = (await page.evaluate(() => window.adminTest.calls)).at(-1);
		expect(lastCall?.args.at(-1)).toEqual(["events/three", "events/one", "events/two"]);
	});

	test("eventImages: Remove is confirmed and labelled", async ({ page }) => {
		await mountAdmin(page, "eventImages");
		await page.getByRole("button", { name: "Remove photo 1" }).click();
		const dialog = page.getByRole("dialog", { name: "Remove photo 1?" });
		await expect(dialog.getByText(/This is the cover/)).toBeVisible();
		await dialog.getByRole("button", { name: "Keep photo", exact: true }).click();
		await expect(page.locator("li img")).toHaveCount(3);
		await page.getByRole("button", { name: "Remove photo 1" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Remove photo", exact: true }).click();
		await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(page.locator("li img")).toHaveCount(3);
		await outcome(page, "success");
		await page.getByRole("button", { name: "Remove photo 1" }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Remove photo", exact: true }).click();
		await expect(page.locator("li img")).toHaveCount(2);
	});

	test("eventImages: upload state is its own flag", async ({ page }) => {
		await mountAdmin(page, "eventImages");
		await page.locator('input[name="images"]').setInputFiles(fixtureImage("more.jpg"));
		const upload = page.getByRole("button", { name: "Upload photos", exact: true });
		await expect(upload).toBeVisible();
		await outcome(page, "pending");
		await page.getByRole("button", { name: "Move photo 1 right", exact: true }).click();
		await page.getByRole("button", { name: "Save order", exact: true }).click();
		await expect(upload).not.toHaveAttribute("aria-busy", "true");
		await expect(upload).toHaveText("Upload photos");
		await page.evaluate(() => window.adminTest.release?.());
	});

	test("workshops: row anatomy, inline editor, local validation, in-row failure", async ({
		page,
	}) => {
		await mountAdmin(page, "workshops");
		const row = page.getByRole("listitem").first();
		await expect(row.getByRole("button", { name: "Edit Alpha", exact: true })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await expect(row.getByRole("button", { name: "Move Alpha up", exact: true })).toBeDisabled();
		await expect(row.getByRole("button", { name: "Move Alpha down", exact: true })).toBeEnabled();
		await expect(row.getByRole("button", { name: "Delete Alpha", exact: true })).toBeVisible();
		await row.getByRole("button", { name: "Edit Alpha" }).click();
		const title = row.getByRole("textbox", { name: "Title *", exact: true });
		await expect(title).toHaveValue("Alpha");
		await title.fill("");
		const before = await page.evaluate(() => window.adminTest.calls.length);
		await row.getByRole("button", { name: "Save", exact: true }).click();
		await expect(row.getByRole("alert")).toHaveText("Enter a title.");
		expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(before);
		await title.fill("Edited draft");
		await row.getByRole("button", { name: "Save", exact: true }).click();
		await expect(row.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(title).toHaveValue("Edited draft");
		await outcome(page, "success");
		await row.getByRole("button", { name: "Save", exact: true }).click();
		await expect(row.getByText("Saved", { exact: true })).toBeVisible();
		await expect(row.getByRole("button", { name: "Edit Edited draft", exact: true })).toBeVisible();
	});

	test("workshops: touch reorder shows the bar", async ({ page }) => {
		await mountAdmin(page, "workshops");
		await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
		await expect(page.getByText("Workshop order changed")).toBeVisible();
		await expect(page.getByRole("button", { name: "Save order", exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Reset", exact: true }).click();
		await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
	});

	test("workshops: Delete uses outcome labels", async ({ page }) => {
		await mountAdmin(page, "workshops");
		await page.getByRole("button", { name: "Delete Alpha" }).click();
		const dialog = page.getByRole("dialog", { name: 'Delete "Alpha"?' });
		await expect(dialog.getByRole("button", { name: "Delete workshop", exact: true })).toBeVisible();
		await dialog.getByRole("button", { name: "Keep workshop", exact: true }).click();
		await expect(page.getByRole("button", { name: "Delete Alpha" })).toBeVisible();
	});

	test("workshops: create is collapsed and keeps the draft on failure", async ({ page }) => {
		await mountAdmin(page, "workshops");
		await expect(page.getByRole("textbox", { name: "Title *" })).toHaveCount(0);
		await page.getByRole("button", { name: "Add workshop" }).click();
		const duration = page.getByLabel("Duration (hours) (optional)", { exact: true });
		await expect(duration).toHaveAttribute("inputmode", "decimal");
		expect(await duration.getAttribute("type")).toBe("text");
		await page.getByLabel("Title *", { exact: true }).fill("Gond painting");
		await page.getByLabel("Description *", { exact: true }).fill("Paint a Gond motif.");
		await page.getByRole("button", { name: "Add workshop", exact: true }).click();
		await expect(page.locator("form").getByRole("alert")).toHaveText("Change was rejected.");
		await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Gond painting");
	});

	test("testimonials: titles, chip, optimistic Feature, Delete labels", async ({ page }) => {
		await mountAdmin(page, "testimonials");
		await expect(page.getByText(/on alpha/)).toHaveCount(0);
		await expect(page.getByRole("listitem").first()).toContainText("Mira");
		await expect(page.getByText("Admin only")).toBeVisible();
		const feature = page.getByRole("button", {
			name: "Feature testimonial from Mira on the home page",
			exact: true,
		});
		await outcome(page, "pending");
		await feature.click();
		await expect(feature).toHaveAttribute("aria-pressed", "true");
		await expect(page.getByText("Home page", { exact: true })).toBeVisible();
		await outcome(page, "failure");
		await page.evaluate(() => window.adminTest.release?.());
		await expect(feature).toHaveAttribute("aria-pressed", "false");
		await expect(page.getByText("Admin only")).toBeVisible();
		await expect(page.getByRole("listitem").first().getByRole("alert")).toHaveText(
			"Change was rejected.",
		);
		await page.getByRole("button", { name: "Delete testimonial from Mira" }).click();
		const dialog = page.getByRole("dialog", { name: "Delete testimonial from Mira?" });
		await expect(
			dialog.getByRole("button", { name: "Delete testimonial", exact: true }),
		).toBeVisible();
		await dialog.getByRole("button", { name: "Keep testimonial", exact: true }).click();
		await expect(page.getByRole("button", { name: "Delete testimonial from Mira" })).toBeVisible();
	});

	test("testimonialsLinked: the row shows the piece title, never the slug", async ({ page }) => {
		await mountAdmin(page, "testimonialsLinked");
		await expect(page.getByRole("listitem").first()).toContainText("on Alpha");
		await expect(page.getByText(/On Alpha/)).toBeVisible();
		await expect(page.getByText(/on alpha/)).toHaveCount(0);
	});

	test("testimonials: create panel offers titles and sends the slug", async ({ page }) => {
		await mountAdmin(page, "testimonials");
		await page.getByRole("button", { name: "Add testimonial" }).click();
		await expect(page.getByLabel("Quote *", { exact: true })).toBeFocused();
		const select = page.getByLabel("Link to an artwork (optional)", { exact: true });
		await expect(select.locator("option")).toHaveText(["None", "Alpha"]);
		await expect(page.getByRole("switch", { name: "Feature on home page" })).toBeVisible();
		await page.getByLabel("Quote *", { exact: true }).fill("A treasured piece.");
		await page.getByLabel("Author name *", { exact: true }).fill("Ravi");
		await select.selectOption("alpha");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
		const sent = await page.evaluate(() => {
			const call = window.adminTest.calls.find((c) => c.name === "createTestimonial");
			const fd = call?.args[0] as FormData;
			return { artworkSlug: fd.get("artworkSlug"), author: fd.get("authorName") };
		});
		expect(sent).toEqual({ artworkSlug: "alpha", author: "Ravi" });
		await expect(page.getByText("Testimonial from Ravi added.")).toBeVisible();
		await expect(page.getByRole("link", { name: /View on site/ })).toHaveAttribute(
			"href",
			"/work/alpha",
		);
	});

	test("empty states offer the one action and hide it while the panel is open", async ({
		page,
	}) => {
		const cases = [
			{ view: "eventsEmpty", action: "Add event", title: "No events yet", field: "Title *" },
			{ view: "workshopsEmpty", action: "Add workshop", title: "No workshops yet", field: "Title *" },
			{
				view: "testimonialsEmpty",
				action: "Add testimonial",
				title: "No testimonials yet",
				field: "Quote *",
			},
		] as const;
		for (const item of cases) {
			await mountAdmin(page, item.view);
			const empty = page.getByRole("status").filter({ hasText: item.title });
			await expect(empty).toBeVisible();
			await empty.getByRole("button", { name: item.action, exact: true }).click();
			await expect(page.getByLabel(item.field, { exact: true })).toBeFocused();
			await expect(empty.getByRole("button")).toHaveCount(0);
		}
	});

	test("events: pre-pick validation gates the submit", async ({ page }) => {
		await mountAdmin(page, "events");
		await page.getByRole("button", { name: "Add event" }).click();
		const files = Array.from({ length: 13 }, (_, i) => fixtureImage(`photo-${i}.jpg`));
		await page.locator('input[name="images"]').setInputFiles(files);
		await expect(page.getByText("Choose up to 12 photos at a time. You picked 13.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeDisabled();
		await page.locator('input[name="images"]').setInputFiles(files.slice(0, 2));
		await expect(page.getByText("Choose up to 12 photos at a time. You picked 13.")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeEnabled();
		await expect(page.getByText("2 photos selected", { exact: true })).toBeVisible();
	});

	test("events: success notice persists until the panel reopens", async ({ page }) => {
		await mountAdmin(page, "events");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Add event" }).click();
		await page.getByLabel("Title *", { exact: true }).fill("Monsoon show");
		await page.getByRole("button", { name: "Add event", exact: true }).click();
		await expect(page.getByText('"Monsoon show" added.')).toBeVisible();
		await page.getByRole("button", { name: "Add event", exact: true }).click();
		await expect(page.getByText('"Monsoon show" added.')).toHaveCount(0);
	});

	test("undo bar after Pin and Feature", async ({ page }) => {
		await mountAdmin(page, "events");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Pin Gathering to top" }).click();
		const status = page.getByRole("status").filter({ hasText: "pinned to top" });
		await expect(status).toContainText('"Gathering" pinned to top');
		await status.getByRole("button", { name: "Undo", exact: true }).click();
		await expect(status).toHaveCount(0);
		const undoCall = (await page.evaluate(() => window.adminTest.calls)).at(-1);
		expect(undoCall?.name).toBe("setEventFeatured");
		expect(undoCall?.args).toEqual(["event-1", false]);

		await mountAdmin(page, "testimonials");
		await outcome(page, "success");
		await page
			.getByRole("button", { name: "Feature testimonial from Mira on the home page" })
			.click();
		const featureStatus = page
			.getByRole("status")
			.filter({ hasText: "Testimonial from Mira featured" });
		await expect(featureStatus).toBeVisible();
		const callsBefore = await page.evaluate(() => window.adminTest.calls.length);
		await featureStatus.getByRole("button", { name: "Dismiss", exact: true }).click();
		await expect(featureStatus).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(callsBefore);

		// A failed undo keeps the bar with the alert inside it.
		await mountAdmin(page, "events");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Pin Gathering to top" }).click();
		await expect(page.getByRole("status").filter({ hasText: "pinned to top" })).toBeVisible();
		await outcome(page, "failure");
		await page.getByRole("button", { name: "Undo", exact: true }).click();
		await expect(page.getByRole("status").getByRole("alert")).toHaveText(
			"Something went wrong. Refresh and try again.",
		);
	});
});

// Visual-upgrade pass (visual-direction-admin Tiers 2b-2d): batch strip tiles
// with one gold Cover chip, the in-grid Add photos tile, the workshop duration
// disc, the testimonial quote mark and the Featured switch. CSS-less harness:
// DOM, ARIA, calls and copy only, never geometry.
test.describe("admin content visual pass @mobile", () => {
	test("events: the batch strip shows per-photo tiles with one Cover chip", async ({ page }) => {
		await mountAdmin(page, "events");
		await page.getByRole("button", { name: "Add event" }).click();
		await page
			.locator('input[name="images"]')
			.setInputFiles([fixtureImage("a.jpg"), fixtureImage("b.jpg"), fixtureImage("c.jpg")]);
		const form = page.locator("form");
		await expect(form.locator("li img")).toHaveCount(3);
		await expect(page.getByText("Cover", { exact: true })).toHaveCount(1);
		await expect(page.getByText(/The first is the cover\./)).toBeVisible();
		await expect(page.getByText("3 photos selected", { exact: true })).toBeVisible();
	});

	test("events: row meta joins date, category and photo count with commas", async ({ page }) => {
		await mountAdmin(page, "events");
		// The fixture events carry no category; en-IN ICU may print "Sep" or "Sept".
		await expect(page.getByRole("listitem").first()).toContainText(/1 Sept? 2026, 3 photos/);
	});

	test("eventImages: the grid ends with the Add photos tile", async ({ page }) => {
		await mountAdmin(page, "eventImages");
		await expect(page.getByRole("listitem").last()).toContainText("Add photos");
		await page.locator('input[name="images"]').setInputFiles(fixtureImage("more.jpg"));
		await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Upload photos", exact: true })).toBeVisible();
	});

	test("workshops: every row leads with a decorative duration disc", async ({ page }) => {
		await mountAdmin(page, "workshops");
		const discs = page.locator("[data-duration-disc]");
		await expect(discs).toHaveCount(3);
		await expect(discs.first()).toHaveAttribute("aria-hidden", "true");
	});

	test("testimonials: the quote opens with a decorative mark, no smart quotes", async ({
		page,
	}) => {
		await mountAdmin(page, "testimonials");
		const quote = page.locator("blockquote").first();
		await expect(quote).toContainText("Beautiful work.");
		await expect(quote.locator('span[aria-hidden="true"]')).toHaveText('"');
		await expect(page.getByText("\u201cBeautiful work.\u201d")).toHaveCount(0);
	});

	test("testimonials: the visibility chip sits on the author line", async ({ page }) => {
		await mountAdmin(page, "testimonialsLinked");
		const row = page.getByRole("listitem").first();
		await expect(row.getByText("On Alpha", { exact: true })).toBeVisible();
		await expect(row.getByText(/Mira, on Alpha/)).toBeVisible();
	});

	test("testimonials: the Featured switch submits the form value", async ({ page }) => {
		await mountAdmin(page, "testimonials");
		await page.getByRole("button", { name: "Add testimonial" }).click();
		const featured = page.getByRole("switch", { name: "Feature on home page" });
		await expect(featured).toHaveAttribute("aria-checked", "false");
		await featured.click();
		await expect(featured).toHaveAttribute("aria-checked", "true");
		await page.getByLabel("Quote *", { exact: true }).fill("A treasured piece.");
		await page.getByLabel("Author name *", { exact: true }).fill("Ravi");
		await outcome(page, "success");
		await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
		const sent = await page.evaluate(() => {
			const call = window.adminTest.calls.find((c) => c.name === "createTestimonial");
			const fd = call?.args[0] as FormData;
			return { featured: fd.get("featured") };
		});
		expect(sent.featured).toBe("on");
	});
});

