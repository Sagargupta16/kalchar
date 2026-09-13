import { expect, type Locator, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const REJECTED = "Change was rejected.";
const failures = [
	{ outcome: "failure", message: REJECTED },
	{ outcome: "throw", message: "Connection interrupted." },
] as const;

const rowOf = (page: Page, title: string) =>
	page.getByRole("listitem").filter({ has: page.getByRole("button", { name: `Edit ${title}` }) });
const calls = (page: Page) => page.evaluate(() => window.adminTest.calls);
const refreshes = (page: Page) => page.evaluate(() => window.adminTest.refreshes);
const editor = (page: Page) => page.getByRole("dialog", { name: "Edit piece" });
const titleField = (page: Page) => page.getByRole("textbox", { name: "Title *" });

const fixtureImage = (name: string) => ({
	name,
	mimeType: "image/jpeg",
	buffer: Buffer.from(`isolated upload fixture ${name}`),
});

/** Mounts the add form and expands it when the viewport collapsed it (D36). */
async function mountUpload(page: Page, view: "upload" | "uploadEmpty" = "upload") {
	await mountAdmin(page, view);
	const trigger = page.getByRole("button", { name: "Add a piece" });
	if (await trigger.count()) await trigger.click();
	await expect(page.locator("form")).toBeVisible();
}

async function openStatusSheet(page: Page, title: string, current: string) {
	await page.getByRole("button", { name: `Status of ${title}: ${current}` }).click();
	return page.getByRole("dialog", { name: title });
}

async function editAlpha(page: Page): Promise<Locator> {
	await page.getByRole("button", { name: "Edit Alpha" }).click();
	const dialog = editor(page);
	await expect(dialog).toBeVisible();
	return dialog;
}

test("every row shows the R6 anatomy in reading order", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const states = { Alpha: "Not for sale", Bravo: "Available", Charlie: "Sold" } as const;
	for (const [index, [title, status]] of Object.entries(states).entries()) {
		for (const name of [
			`Reorder ${title}, position ${index + 1} of 3`,
			`Edit ${title}`,
			`Status of ${title}: ${status}`,
			`Feature ${title}`,
			`Delete ${title}`,
		]) {
			await expect(page.getByRole("button", { name, exact: true })).toBeEnabled();
		}
		const order = await rowOf(page, title)
			.locator("button[aria-label]")
			.evaluateAll((buttons) =>
				buttons
					.map((button) => button.getAttribute("aria-label") ?? "")
					.filter((label) => /^(Reorder|Edit|Status of|Feature|Delete) /.test(label))
					.map((label) => label.split(" ")[0]),
			);
		expect(order).toEqual(["Reorder", "Edit", "Status", "Feature", "Delete"]);
	}
	await expect(page.getByRole("button", { name: "Feature Bravo" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(page.getByRole("button", { name: "Feature Alpha" })).toHaveAttribute(
		"aria-pressed",
		"false",
	);
	await expect(rowOf(page, "Bravo")).toContainText("INR 12,000");
	await expect(rowOf(page, "Charlie")).not.toContainText("INR");
});

test("Edit body opens the editor and focus returns on close", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await editAlpha(page);
	await expect(titleField(page)).toHaveValue("Alpha");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Edit Alpha" })).toBeFocused();
});

test("status chip opens the quick-state sheet with the current option pressed", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	const sheet = await openStatusSheet(page, "Alpha", "Not for sale");
	await expect(sheet).toBeVisible();
	for (const option of ["Available", "Sold", "Not for sale"]) {
		await expect(sheet.getByRole("button", { name: option, exact: true })).toBeAttached();
	}
	await expect(sheet.getByRole("button", { name: "Not for sale", exact: true })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	const available = sheet.getByRole("button", { name: "Available", exact: true });
	await expect(available).toBeEnabled();
	await expect(available).toHaveAccessibleDescription(/No price yet/);
	// The footer Close (the header X shares the name).
	await sheet.getByText("Close", { exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);

	const priced = await openStatusSheet(page, "Bravo", "Available");
	const notForSale = priced.getByRole("button", { name: "Not for sale", exact: true });
	await expect(notForSale).toBeDisabled();
	await expect(notForSale).toHaveAccessibleDescription(/has a price/);
});

for (const failure of failures) {
	test(`quick status flips optimistically and reverts on ${failure.outcome}`, async ({ page }) => {
		await mountAdmin(page, "artworks");
		await outcome(page, failure.outcome);
		const sheet = await openStatusSheet(page, "Alpha", "Not for sale");
		await sheet.getByRole("button", { name: "Sold", exact: true }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(rowOf(page, "Alpha").getByRole("alert")).toHaveText(failure.message);
		await expect(
			page.getByRole("button", { name: "Status of Alpha: Not for sale" }),
		).toBeEnabled();
		expect(await refreshes(page)).toBe(0);
		expect((await calls(page)).at(-1)).toEqual({
			name: "setArtworkStatus",
			args: ["alpha", "sold"],
		});
	});

	test(`featured toggle reverts with an in-row alert on ${failure.outcome}`, async ({ page }) => {
		await mountAdmin(page, "artworks");
		await outcome(page, failure.outcome);
		const star = page.getByRole("button", { name: "Feature Alpha" });
		await star.click();
		await expect(rowOf(page, "Alpha").getByRole("alert")).toHaveText(failure.message);
		await expect(star).toHaveAttribute("aria-pressed", "false");
	});
}

test("quick status persists on success", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const sheet = await openStatusSheet(page, "Alpha", "Not for sale");
	await sheet.getByRole("button", { name: "Sold", exact: true }).click();
	await expect(page.getByRole("button", { name: "Status of Alpha: Sold" })).toBeEnabled();
	await expect.poll(() => refreshes(page)).toBe(1);
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("featured toggle round-trips on success and never double-submits", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const star = page.getByRole("button", { name: "Feature Alpha" });
	await star.click();
	await expect(star).toHaveAttribute("aria-pressed", "true");
	expect((await calls(page)).at(-1)).toEqual({ name: "setArtworkFeatured", args: ["alpha", true] });

	await outcome(page, "pending");
	const bravo = page.getByRole("button", { name: "Feature Bravo" });
	await bravo.click();
	await expect(bravo).toBeDisabled();
	await bravo.click({ force: true });
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(2);
	await page.evaluate(() => window.adminTest.release?.());
	await expect(bravo).toBeEnabled();
	await expect(bravo).toHaveAttribute("aria-pressed", "false");
});

test("row delete uses outcome labels, keeps the row on failure, removes it on success", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "Delete Alpha" }).click();
	const confirm = page.getByRole("dialog", { name: 'Delete "Alpha"?' });
	await expect(confirm.getByRole("button", { name: "Keep piece" })).toBeFocused();
	await confirm.getByRole("button", { name: "Delete piece" }).click();
	await expect(rowOf(page, "Alpha").getByRole("alert")).toHaveText(REJECTED);
	await expect(page.getByRole("button", { name: "Delete Alpha" })).toBeEnabled();
	expect(await refreshes(page)).toBe(0);

	await outcome(page, "success");
	await page.getByRole("button", { name: "Delete Alpha" }).click();
	await page
		.getByRole("dialog", { name: 'Delete "Alpha"?' })
		.getByRole("button", { name: "Delete piece" })
		.click();
	await expect(page.getByRole("listitem")).toHaveCount(2);
	await expect(page.locator("output")).toHaveText(/"Alpha" deleted/);
});

test("editor save shows the result in the footer and keeps edits on failure", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const dialog = await editAlpha(page);
	const save = dialog.getByRole("button", { name: "Save changes" });
	await expect(save).toHaveCount(0);
	await titleField(page).fill("Unsaved title");
	await expect(save).toBeVisible();
	await expect(dialog.getByText("Unsaved changes")).toBeVisible();
	await save.click();
	await expect(dialog.getByRole("alert")).toHaveText(REJECTED);
	await expect(dialog).toBeVisible();
	await expect(titleField(page)).toHaveValue("Unsaved title");

	await outcome(page, "success");
	await save.click();
	await expect(dialog.locator("output")).toHaveText(/Piece updated/);
	await expect(save).toHaveCount(0);
	const last = (await calls(page)).at(-1);
	expect(last?.name).toBe("updateArtwork");
	expect(last?.args[1]).toMatchObject({ title: "Unsaved title", status: "archive" });
});

test("editor asks before discarding", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const dialog = await editAlpha(page);
	await titleField(page).fill("Unsaved title");
	await page.keyboard.press("Escape");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeFocused();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(titleField(page)).toHaveValue("Unsaved title");
	await page.keyboard.press("Escape");
	await dialog.getByRole("button", { name: "Discard", exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const failure of failures) {
	test(`editor delete is an inline step, never a second dialog (${failure.outcome})`, async ({
		page,
	}) => {
		await mountAdmin(page, "artworks");
		await outcome(page, failure.outcome);
		const dialog = await editAlpha(page);
		await titleField(page).fill("Unsaved title");
		await dialog.getByRole("button", { name: "Delete piece" }).click();
		await expect(page.locator("dialog[open]")).toHaveCount(1);
		await expect(dialog.getByRole("heading", { name: 'Delete "Alpha"?' })).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Keep piece" })).toBeFocused();
		await dialog.getByRole("button", { name: "Delete piece" }).click();
		await expect(dialog.getByRole("alert")).toHaveText(failure.message);
		await expect(editor(page)).toBeVisible();
		await expect(dialog.locator("output")).toHaveCount(0);
		await dialog.getByRole("button", { name: "Keep piece" }).click();
		await expect(titleField(page)).toHaveValue("Unsaved title");
	});
}

test("editor delete closes the sheet and removes the row on success", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const dialog = await editAlpha(page);
	await dialog.getByRole("button", { name: "Delete piece" }).click();
	await dialog.getByRole("button", { name: "Delete piece" }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("listitem")).toHaveCount(2);
});

test("editor validates required fields client-side", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const dialog = await editAlpha(page);
	await titleField(page).fill("");
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog.getByText("Enter a title")).toBeVisible();
	await expect(titleField(page)).toHaveAttribute("aria-invalid", "true");
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(0);
	await titleField(page).fill("A");
	await expect(dialog.getByText("Enter a title")).toHaveCount(0);
});

test("replace photo shows the preview, then the Replace button", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const dialog = await editAlpha(page);
	await expect(dialog.getByText("Replace photo")).toHaveCount(0);
	await dialog.locator('input[name="image"]').setInputFiles(fixtureImage("new.jpg"));
	await expect(dialog.getByText("new.jpg")).toBeVisible();
	const replace = dialog.getByRole("button", { name: "Replace photo" });
	await expect(replace).toBeVisible();
	await replace.click();
	await expect(dialog.getByRole("alert")).toHaveText(REJECTED);
	expect(
		await dialog
			.locator('input[name="image"]')
			.evaluate((input: HTMLInputElement) => input.files?.length),
	).toBe(1);
});

test("search and chips filter the list and lock reorder", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const search = page.getByRole("searchbox", { name: "Find a piece" });
	await search.fill("bra");
	await expect(page.getByRole("listitem")).toHaveCount(1);
	await expect(page.getByText("Showing 1 of 3 pieces")).toBeVisible();
	await expect(page.getByRole("button", { name: /^Reorder Bravo/ })).toBeDisabled();
	await expect(page.getByRole("listitem").first()).toHaveAttribute("draggable", "false");
	await page.getByRole("button", { name: "Clear search" }).click();
	await expect(page.getByRole("listitem")).toHaveCount(3);

	const sold = page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^Sold/ });
	await sold.click();
	await expect(sold).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("listitem")).toHaveCount(1);
	await expect(rowOf(page, "Charlie")).toBeVisible();
	await expect(page.getByText(/Show all pieces to change the order\./)).toBeVisible();

	await search.fill("zzz");
	await expect(page.getByText("No pieces match")).toBeVisible();
	await expect(page.getByText('Nothing matches "zzz"')).toBeVisible();
	await page.getByRole("button", { name: "Show all pieces" }).click();
	await expect(page.getByRole("listitem")).toHaveCount(3);
	await expect(
		page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^All/ }),
	).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: /^Reorder Alpha/ })).toBeEnabled();
});

test("empty list offers one action", async ({ page }) => {
	await mountAdmin(page, "artworksEmpty");
	await expect(page.getByRole("status")).toContainText("No pieces yet");
	await expect(page.getByRole("link", { name: "Add a piece" })).toHaveAttribute(
		"href",
		"#add-piece",
	);
});

test("filtered initial state from the page", async ({ page }) => {
	await mountAdmin(page, "artworksFiltered");
	await expect(page.getByRole("listitem")).toHaveCount(1);
	await expect(rowOf(page, "Charlie")).toBeVisible();
	await expect(
		page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^Sold/ }),
	).toHaveAttribute("aria-pressed", "true");
});

test("staged order survives a quick state refresh", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).focus();
	await page.keyboard.press("ArrowDown");
	const save = page.getByRole("button", { name: "Save order" });
	await expect(save).toBeVisible();
	await outcome(page, "success");
	await page.getByRole("button", { name: "Feature Bravo" }).click();
	await expect.poll(() => refreshes(page)).toBe(1);
	await expect(page.getByRole("listitem").first()).toContainText("Bravo");
	await expect(save).toBeVisible();
	await expect(page.getByText(/marked as|featured on/)).toHaveCount(0);
});

test("add form is photo-first and reports success in the artist's words", async ({ page }) => {
	await mountUpload(page);
	await expect(page.locator("form label").first()).toContainText(
		"Choose image (JPG, PNG, or WebP)",
	);
	await expect(page.getByText("Fields marked * are required.")).toBeVisible();
	const picker = page.locator('input[name="image"]');
	expect(await picker.evaluate((input: HTMLInputElement) => input.required)).toBe(false);
	await page.getByLabel("Title *", { exact: true }).fill("Lotus garden");
	await page.getByLabel("Category *", { exact: true }).selectOption("Gond");
	await page.getByLabel("Medium *", { exact: true }).fill("Ink");
	await page.getByRole("button", { name: "Add piece", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("Choose an image first.");

	await picker.setInputFiles(fixtureImage("lotus.jpg"));
	await expect(page.getByLabel("Title *", { exact: true })).toBeFocused();
	await outcome(page, "success");
	await page.getByRole("button", { name: "Add piece", exact: true }).click();
	const output = page.locator("output");
	await expect(output).toContainText('Added "Lotus garden". It is now in the gallery.');
	await expect(output.getByRole("link", { name: "View on site" })).toHaveAttribute(
		"href",
		"/work/created-piece/",
	);
	await expect(output.getByRole("link", { name: "Show in list" })).toHaveAttribute(
		"href",
		"#piece-created-piece",
	);
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("");
	await expect(picker).toBeFocused();
});

test("numeric fields keep digits only", async ({ page }) => {
	await mountUpload(page);
	const price = page.getByLabel("Price (optional)", { exact: true });
	await price.fill("1,200");
	await expect(price).toHaveValue("1200");
	await expect(page.getByText("Shows as INR 1,200")).toBeVisible();
	await expect(price).toHaveAttribute("inputmode", "numeric");
	await expect(page.getByLabel("Year (optional)", { exact: true })).toHaveAttribute(
		"inputmode",
		"numeric",
	);
});

test("add form is collapsed on phones and open when the catalog is empty", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mountAdmin(page, "upload");
	await expect(page.locator("form")).toHaveCount(0);
	const trigger = page.getByRole("button", { name: "Add a piece" });
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
	await trigger.click();
	await expect(page.locator("form")).toBeVisible();
	await expect(page.locator('input[name="image"]')).toBeFocused();

	await mountAdmin(page, "uploadEmpty");
	await expect(page.locator("form")).toBeVisible();
	await expect(page.getByRole("button", { name: "Add a piece" })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Add one in Categories" })).toBeVisible();

	await page.setViewportSize({ width: 1280, height: 800 });
	await mountAdmin(page, "upload");
	await expect(page.locator("form")).toBeVisible();
	await expect(page.getByRole("button", { name: "Add a piece" })).toHaveCount(0);
});

test("add form prefills the last-used category and medium and offers suggestions", async ({
	page,
}) => {
	await mountUpload(page);
	await expect(page.getByRole("combobox", { name: "Category *" })).toHaveValue("Gond");
	// An input with a datalist exposes the combobox role.
	const medium = page.getByRole("combobox", { name: "Medium *" });
	await expect(medium).toHaveValue("Ink");
	await expect(medium).toHaveAttribute("required", "");
	const options = async (field: Locator) =>
		field.evaluate((input: HTMLInputElement) => input.list?.options.length ?? -1);
	expect(await options(medium)).toBe(2);
	expect(await options(page.getByRole("combobox", { name: "Dimensions (optional)" }))).toBe(1);
});

test("quick states offer Undo in the bottom bar and Undo runs the reverse action once", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const bar = page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) });

	const sheet = await openStatusSheet(page, "Alpha", "Not for sale");
	await sheet.getByRole("button", { name: "Sold", exact: true }).click();
	await expect(bar).toContainText('"Alpha" marked as sold');
	await expect(bar.getByRole("button", { name: "Dismiss" })).toBeVisible();
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar).toHaveCount(0);
	expect((await calls(page)).at(-1)).toEqual({
		name: "setArtworkStatus",
		args: ["alpha", "archive"],
	});
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Status of Alpha: Not for sale" })).toBeEnabled();

	await page.getByRole("button", { name: "Feature Alpha" }).click();
	await expect(bar).toContainText('"Alpha" featured on home');
	await bar.getByRole("button", { name: "Undo" }).click();
	expect((await calls(page)).at(-1)).toEqual({
		name: "setArtworkFeatured",
		args: ["alpha", false],
	});
	await expect(page.getByRole("button", { name: "Feature Alpha" })).toHaveAttribute(
		"aria-pressed",
		"false",
	);

	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).focus();
	await page.keyboard.press("ArrowDown");
	await page.getByRole("button", { name: "Feature Bravo" }).click();
	await expect(page.getByRole("button", { name: "Save order" })).toBeVisible();
	await expect(page.getByText(/marked as|featured on/)).toHaveCount(0);
	await page.getByRole("button", { name: "Reset", exact: true }).click();

	await page.getByRole("button", { name: "Feature Charlie" }).click();
	await expect(bar).toContainText('"Charlie" featured on home');
	const before = await page.evaluate(() => window.adminTest.calls.length);
	await outcome(page, "failure");
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar.getByRole("alert")).toHaveText(REJECTED);
	await expect(bar).toBeVisible();
	await bar.getByRole("button", { name: "Dismiss" }).click();
	await expect(bar).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(before + 1);
});
