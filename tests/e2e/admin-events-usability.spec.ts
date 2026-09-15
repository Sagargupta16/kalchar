import { expect, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const photo = (name: string, mimeType = "image/jpeg", buffer = Buffer.from("fixture photo")) => ({
	name,
	mimeType,
	buffer,
});

function draftIsProtected(page: Page) {
	return page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

test.beforeEach(async ({ page }) => {
	await page.route("**/*", (route) => route.abort());
});

test("event drafts and the selected cover survive collapsing the editor", async ({ page }) => {
	await mountAdmin(page, "events");
	const row = page.locator("#event-event-1");
	const toggle = row.getByRole("button", { name: "Edit Gathering", exact: true });
	await toggle.click();
	await row.getByRole("textbox", { name: "Title *", exact: true }).fill("Gathering draft");
	await row.getByLabel("Description (optional)").fill("Keep this description.");
	await row.locator('input[type="file"]').setInputFiles(photo("extra.jpg"));
	await row.getByRole("button", { name: "Make photo 3 the cover" }).click();
	await toggle.click();
	await expect(row.getByRole("button", { name: "Save details" })).toBeHidden();
	await toggle.press("Enter");
	await expect(row.getByRole("textbox", { name: "Title *", exact: true })).toHaveValue(
		"Gathering draft",
	);
	await expect(row.getByLabel("Description (optional)")).toHaveValue("Keep this description.");
	await expect(row.getByRole("button", { name: "Upload photos" })).toBeVisible();
	await expect(row.getByRole("button", { name: "Save order" })).toBeVisible();
	await expect(row.getByRole("img", { name: "Cover", exact: true })).toHaveAttribute(
		"src",
		/events\/three-400\.webp$/,
	);
});

test("a pending details save locks only that event's conflicting actions", async ({ page }) => {
	await mountAdmin(page, "events");
	const row = page.locator("#event-event-1");
	await row.getByRole("button", { name: "Edit Gathering", exact: true }).click();
	await row.getByRole("textbox", { name: "Title *", exact: true }).fill("Saved gathering");
	await outcome(page, "pending");
	await row.getByRole("button", { name: "Save details" }).click();
	await expect(row.getByRole("button", { name: "Edit Gathering", exact: true })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Delete Gathering", exact: true })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Pin Gathering to top" })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Make photo 2 the cover" })).toBeDisabled();
	await expect(
		page.getByRole("button", { name: "Delete Monsoon exhibition at the community hall" }),
	).toBeEnabled();
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(row.getByRole("button", { name: "Edit Saved gathering" })).toBeEnabled();
});

test("pin undo restores the displayed state without reverting a later details edit", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	const row = page.locator("#event-event-1");
	await row.getByRole("button", { name: "Pin Gathering to top" }).click();
	await row.getByRole("button", { name: "Edit Gathering", exact: true }).click();
	await row.getByRole("textbox", { name: "Title *", exact: true }).fill("Renamed gathering");
	await row.getByRole("button", { name: "Save details" }).click();
	// The isolated harness omits Tailwind's fixed-bar positioning.
	const undo = page.getByRole("button", { name: "Undo", exact: true });
	await undo.focus();
	await undo.press("Enter");
	await expect(row.getByRole("button", { name: "Pin Renamed gathering to top" })).toHaveAttribute(
		"aria-pressed",
		"false",
	);
});

test("blank event titles are rejected before reserving an event or processing photos", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await page.getByRole("textbox", { name: "Title *", exact: true }).fill("   ");
	await page.locator('input[type="file"]').setInputFiles(photo("cover.jpg"));
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("Enter a title.");
	await expect(page.getByRole("textbox", { name: "Title *", exact: true })).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("a new create attempt does not show the previous form's server error", async ({ page }) => {
	await mountAdmin(page, "events");
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await page.getByRole("textbox", { name: "Title *", exact: true }).fill("First attempt");
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await page.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeFocused();
	await page.getByRole("button", { name: "Add event", exact: true }).press("Enter");
	await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const view of ["events", "eventImages"] as const) {
	for (const invalid of [
		{ name: "empty", files: [photo("empty.jpg", "image/jpeg", Buffer.alloc(0))], error: /empty/ },
		{ name: "unsupported", files: [photo("notes.txt", "text/plain")], error: /JPG, PNG or WebP/ },
		{
			name: "too many",
			files: Array.from({ length: 13 }, (_, index) => photo(`photo-${index}.jpg`)),
			error: /up to 12 photos/,
		},
	]) {
		test(`${view} rejects ${invalid.name} photos before submission`, async ({ page }) => {
			await mountAdmin(page, view);
			if (view === "events") {
				await page.getByRole("button", { name: "Add event", exact: true }).click();
			}
			const input = page.locator('input[type="file"]');
			await input.setInputFiles(invalid.files);
			await expect(page.getByRole("alert")).toContainText(invalid.error);
			await expect(input).toHaveAttribute("aria-invalid", "true");
			await expect(
				page.getByRole("button", {
					name: view === "events" ? "Add event" : "Upload photos",
					exact: true,
				}),
			).toBeDisabled();
			expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
		});
	}
}

test("selected photos can be removed before upload and the submitted batch follows the preview", async ({
	page,
}) => {
	await mountAdmin(page, "eventImages");
	await outcome(page, "success");
	await page.locator('input[type="file"]').setInputFiles([photo("keep.jpg"), photo("remove.jpg")]);
	await page.getByRole("button", { name: "Remove selected photo 2: remove.jpg" }).click();
	await expect(page.getByRole("img", { name: /remove.jpg/ })).toHaveCount(0);
	await page.getByRole("button", { name: "Upload photos", exact: true }).click();
	await expect(page.getByRole("button", { name: "Upload photos", exact: true })).toHaveCount(0);
	expect(
		await page.evaluate(() =>
			window.adminTest.calls.filter((call) => call.name === "processEventPhoto"),
		),
	).toHaveLength(1);
});

test("uploading or removing photos cannot silently discard an unsaved order", async ({ page }) => {
	await mountAdmin(page, "eventImages");
	await page.locator('input[type="file"]').setInputFiles(photo("new.jpg"));
	await page.getByRole("button", { name: "Make photo 3 the cover" }).click();
	await expect(page.getByRole("button", { name: "Upload photos", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Remove photo 1", exact: true })).toBeDisabled();
	await expect(
		page.getByText("Save or reset the photo order before uploading or removing photos."),
	).toBeVisible();
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	await expect(page.getByRole("button", { name: "Upload photos", exact: true })).toBeEnabled();
	await expect(page.getByRole("button", { name: "Remove photo 1", exact: true })).toBeEnabled();
});

test("removing all event photos also clears the row cover and photo count", async ({ page }) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	const row = page.locator("#event-event-1");
	const toggle = row.getByRole("button", { name: "Edit Gathering", exact: true });
	await toggle.click();
	for (let index = 0; index < 3; index += 1) {
		await row.getByRole("button", { name: "Remove photo 1", exact: true }).click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Remove photo", exact: true })
			.click();
		await expect(row.getByRole("img")).toHaveCount(2 - index);
	}
	await expect(toggle).toContainText("0 photos");
	await expect(toggle.locator("img")).toHaveCount(0);
});

test("editing a saved draft clears the stale Saved message and links validation to the field", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	const row = page.locator("#event-event-1");
	await row.getByRole("button", { name: "Edit Gathering", exact: true }).click();
	const title = row.getByRole("textbox", { name: "Title *", exact: true });
	await title.fill("Saved gathering");
	await row.getByRole("button", { name: "Save details" }).click();
	await expect(row.getByText("Saved", { exact: true })).toBeVisible();
	await title.fill("   ");
	await expect(row.getByText("Saved", { exact: true })).toHaveCount(0);
	await row.getByRole("button", { name: "Save details" }).click();
	await expect(title).toBeFocused();
	await expect(title).toHaveAttribute("aria-invalid", "true");
	await title.fill("Valid title");
	await expect(row.getByRole("alert")).toHaveCount(0);
});

test("photo processing locks the event and a failed upload keeps the selection for retry", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	const row = page.locator("#event-event-1");
	await row.getByRole("button", { name: "Edit Gathering", exact: true }).click();
	await row.locator('input[type="file"]').setInputFiles(photo("extra.jpg"));
	await outcome(page, "pending");
	await row.getByRole("button", { name: "Upload photos", exact: true }).click();
	await expect(row.getByRole("button", { name: "Save details" })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Pin Gathering to top" })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Delete Gathering" })).toBeDisabled();
	await expect(row.getByRole("button", { name: "Edit Gathering", exact: true })).toBeDisabled();
	await expect(
		row.getByRole("button", { name: "Remove selected photo 1: extra.jpg" }),
	).toBeDisabled();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(row.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(row.getByRole("img", { name: "Selection 1: extra.jpg" })).toBeVisible();
	await expect(row.getByRole("button", { name: "Upload photos", exact: true })).toBeEnabled();
	await outcome(page, "success");
	await row.getByRole("button", { name: "Upload photos", exact: true }).click();
	await expect(row.getByRole("button", { name: "Edit Gathering", exact: true })).toContainText(
		"4 photos",
	);
	await expect(row.getByText("1 photo added.", { exact: true })).toBeVisible();
	await expect(row.getByRole("alert")).toHaveCount(0);
});

test("selected photos support keyboard cover changes and removal keeps focus in the chooser", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await page.locator('input[type="file"]').setInputFiles([photo("one.jpg"), photo("two.jpg")]);
	const handle = page.getByRole("button", { name: "Reorder selected photo 2, position 2 of 2" });
	await handle.focus();
	await handle.press("Home");
	await expect(page.getByRole("img", { name: "Selection 1: two.jpg" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Reorder selected photo 1, position 1 of 2" }),
	).toBeFocused();
	await page.getByRole("button", { name: "Remove selected photo 1: two.jpg" }).click();
	const remaining = page.getByRole("button", { name: "Remove selected photo 1: one.jpg" });
	await expect(remaining).toBeFocused();
	await remaining.press("Enter");
	await expect(page.locator('input[type="file"]')).toBeFocused();
	await expect(page.getByText("Choose photos (you can select several)")).toBeVisible();
});

for (const view of ["events", "eventImages"] as const) {
	test(`${view} rejects photos over the 20 MB limit without making an action call`, async ({
		page,
	}) => {
		await mountAdmin(page, view);
		if (view === "events") {
			await page.getByRole("button", { name: "Add event", exact: true }).click();
		}
		await page
			.locator('input[type="file"]')
			.setInputFiles(photo("too-large.jpg", "image/jpeg", Buffer.alloc(20 * 1024 * 1024 + 1)));
		await expect(page.getByRole("alert")).toContainText("Photos must be 20 MB or smaller.");
		await expect(
			page.getByRole("button", {
				name: view === "events" ? "Add event" : "Upload photos",
				exact: true,
			}),
		).toBeDisabled();
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
	});
}

test("deleting an event returns keyboard focus to the remaining event list", async ({ page }) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Delete Gathering", exact: true }).click();
	const confirm = page
		.getByRole("dialog")
		.getByRole("button", { name: "Delete event", exact: true });
	await confirm.focus();
	await confirm.press("Enter");
	await expect(page.getByRole("region", { name: "All events (1)", exact: true })).toBeFocused();
});

test("pinning and undoing an older event immediately update the displayed order", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	await page
		.getByRole("button", { name: "Pin Monsoon exhibition at the community hall to top" })
		.click();
	await expect(page.locator("li[id^='event-']").first()).toHaveAttribute("id", "event-event-2");
	const undo = page.getByRole("button", { name: "Undo", exact: true });
	await undo.focus();
	await undo.press("Enter");
	await expect(page.locator("li[id^='event-']").first()).toHaveAttribute("id", "event-event-1");
});

for (const failure of ["failure", "throw"] as const) {
	test(`a details ${failure} preserves the draft and supports a successful retry`, async ({
		page,
	}) => {
		await mountAdmin(page, "events");
		await outcome(page, failure);
		const row = page.locator("#event-event-1");
		await row.getByRole("button", { name: "Edit Gathering", exact: true }).click();
		const title = row.getByRole("textbox", { name: "Title *", exact: true });
		await title.fill("Revised gathering");
		await title.press("Enter");
		await expect(row.getByRole("alert")).toHaveText(
			failure === "failure" ? "Change was rejected." : "Connection interrupted.",
		);
		await expect(title).toHaveValue("Revised gathering");
		await expect(row.getByText("Saved", { exact: true })).toHaveCount(0);
		await outcome(page, "success");
		await title.press("Enter");
		await expect(row.getByRole("button", { name: "Edit Revised gathering" })).toBeEnabled();
		await expect(row.getByText("Saved", { exact: true })).toBeVisible();
	});
}

test("the create form guards changed fields and selected photos, then clears on cancel", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await page.getByRole("button", { name: "Add event", exact: true }).click();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
	const date = page.getByLabel("Event date *", { exact: true });
	const original = await date.inputValue();
	await date.fill("2027-01-01");
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await date.fill(original);
	await expect.poll(() => draftIsProtected(page)).toBe(false);
	await page.getByLabel("Title *", { exact: true }).fill("Unsaved event");
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await page.getByLabel("Title *", { exact: true }).fill("");
	await page.locator('input[type="file"]').setInputFiles(photo("draft.jpg"));
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await page.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
});

test("metadata stays guarded while collapsed and releases the guard after saving", async ({
	page,
}) => {
	await mountAdmin(page, "events");
	await outcome(page, "success");
	const row = page.locator("#event-event-1");
	const toggle = row.getByRole("button", { name: "Edit Gathering", exact: true });
	await toggle.click();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
	await row.getByLabel("Title *", { exact: true }).fill("Draft gathering");
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await toggle.click();
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await toggle.click();
	await row.getByRole("button", { name: "Save details", exact: true }).click();
	await expect(row.getByText("Saved", { exact: true })).toBeVisible();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
});

test("the inline photo order and selected photos each register unsaved drafts", async ({
	page,
}) => {
	await mountAdmin(page, "eventImages");
	await expect.poll(() => draftIsProtected(page)).toBe(false);
	await page.getByRole("button", { name: "Make photo 2 the cover" }).click();
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
	await page.locator('input[type="file"]').setInputFiles(photo("draft.jpg"));
	await expect.poll(() => draftIsProtected(page)).toBe(true);
	await page.getByRole("button", { name: "Remove selected photo 1: draft.jpg" }).click();
	await expect.poll(() => draftIsProtected(page)).toBe(false);
});
