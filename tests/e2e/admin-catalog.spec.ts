import { expect, type Locator, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const REJECTED = "Change was rejected.";
const failures = [
	{ outcome: "failure", message: REJECTED },
	{ outcome: "throw", message: "Connection interrupted." },
] as const;

const rowOf = (page: Page, title: string) =>
	page
		.getByRole("listitem")
		.filter({ has: page.getByRole("button", { name: `Edit ${title}`, exact: true }) });
const calls = (page: Page) => page.evaluate(() => window.adminTest.calls);
const refreshes = (page: Page) => page.evaluate(() => window.adminTest.refreshes);
const editor = (page: Page) => page.getByRole("dialog", { name: "Edit piece" });
const titleField = (page: Page) => page.getByRole("textbox", { name: "Title *" });
const statusGroup = (scope: Page | Locator, title: string) =>
	scope.getByRole("radiogroup", { name: `Status of ${title}` });

const fixtureImage = (name: string) => ({
	name,
	mimeType: "image/jpeg",
	buffer: Buffer.from(`isolated upload fixture ${name}`),
});

/** The grid is the default view (D-A13); list view carries reorder and quick states. */
async function showList(page: Page) {
	await page.getByRole("button", { name: "List view" }).click();
	await expect(page.getByRole("button", { name: /^Reorder Alpha/ })).toBeVisible();
}

/** Opens the editor from Alpha's grid tile (the default view). */
async function editAlpha(page: Page): Promise<Locator> {
	await page.getByRole("button", { name: /^Edit Alpha, position 1/ }).click();
	const dialog = editor(page);
	await expect(dialog).toBeVisible();
	return dialog;
}

test("grid view is the default and tiles carry title, position, featured and status", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await expect(page.getByRole("button", { name: "Grid view" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(
		page.getByRole("button", { name: "Edit Alpha, position 1, Not for sale", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Edit Bravo, position 2, featured, Available", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Edit Charlie, position 3, Sold", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("listitem")).toHaveCount(3);
	// Tiles never carry Move buttons; ordering lives in list view.
	await expect(page.getByRole("button", { name: /^Reorder / })).toHaveCount(0);
	await expect(page.getByText("Switch to list view to change the order.")).toBeVisible();
});

test("a grid tile opens the editor and focus returns on close", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await editAlpha(page);
	await expect(titleField(page)).toHaveValue("Alpha");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: /^Edit Alpha, position 1/ })).toBeFocused();
});

test("the view toggle switches to rows and back", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(statusGroup(page, "Alpha")).toBeVisible();
	await page.getByRole("button", { name: "Grid view" }).click();
	await expect(page.getByRole("button", { name: /^Reorder / })).toHaveCount(0);
	await expect(page.getByRole("button", { name: /^Edit Alpha, position 1/ })).toBeVisible();
});

test("every list row shows the anatomy with the segmented status", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	const states = { Alpha: "Not for sale", Bravo: "Available", Charlie: "Sold" } as const;
	for (const [index, [title, status]] of Object.entries(states).entries()) {
		for (const name of [
			`Reorder ${title}, position ${index + 1} of 3`,
			`Edit ${title}`,
			`Feature ${title}`,
			`Delete ${title}`,
		]) {
			await expect(page.getByRole("button", { name, exact: true })).toBeEnabled();
		}
		const group = statusGroup(page, title);
		await expect(group.getByRole("radio", { checked: true })).toHaveText(new RegExp(status));
		const order = await rowOf(page, title)
			.locator("button[aria-label]")
			.evaluateAll((buttons) =>
				buttons
					.map((button) => button.getAttribute("aria-label") ?? "")
					.filter((label) => /^(Reorder|Edit|Feature|Delete) /.test(label))
					.map((label) => label.split(" ")[0]),
			);
		expect(order).toEqual(["Reorder", "Edit", "Feature", "Delete"]);
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

test("the segmented control blocks Not for sale on a priced piece and explains NFS", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	// Alpha is stored archive: the helper names the public effect.
	await expect(
		rowOf(page, "Alpha").getByText("Shown in the gallery without a price"),
	).toBeVisible();
	// Bravo has a price: the archive segment is disabled with its reason.
	const bravoNfs = statusGroup(page, "Bravo").getByRole("radio", { name: "Not for sale" });
	await expect(bravoNfs).toBeDisabled();
	await expect(rowOf(page, "Bravo").getByText(/has a price/)).toBeVisible();
});

for (const failure of failures) {
	test(`quick status flips optimistically and reverts on ${failure.outcome}`, async ({ page }) => {
		await mountAdmin(page, "artworks");
		await showList(page);
		await outcome(page, failure.outcome);
		await statusGroup(page, "Alpha").getByRole("radio", { name: "Sold" }).click();
		await expect(rowOf(page, "Alpha").getByRole("alert")).toHaveText(failure.message);
		await expect(
			statusGroup(page, "Alpha").getByRole("radio", { checked: true }),
		).toHaveText(/Not for sale/);
		expect(await refreshes(page)).toBe(0);
		expect((await calls(page)).at(-1)).toEqual({
			name: "setArtworkStatus",
			args: ["alpha", "sold"],
		});
	});

	test(`featured toggle reverts with an in-row alert on ${failure.outcome}`, async ({ page }) => {
		await mountAdmin(page, "artworks");
		await showList(page);
		await outcome(page, failure.outcome);
		const star = page.getByRole("button", { name: "Feature Alpha" });
		await star.click();
		await expect(rowOf(page, "Alpha").getByRole("alert")).toHaveText(failure.message);
		await expect(star).toHaveAttribute("aria-pressed", "false");
	});
}

test("quick status persists on success and never opens a dialog", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	await outcome(page, "success");
	await statusGroup(page, "Alpha").getByRole("radio", { name: "Sold" }).click();
	await expect(statusGroup(page, "Alpha").getByRole("radio", { checked: true })).toHaveText(
		/Sold/,
	);
	await expect.poll(() => refreshes(page)).toBe(1);
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("featured toggle round-trips on success and never double-submits", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
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
	await showList(page);
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

test("editor quick states apply at once without dirtying Save", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const dialog = await editAlpha(page);
	await statusGroup(dialog, "Alpha").getByRole("radio", { name: "Sold" }).click();
	await expect(statusGroup(dialog, "Alpha").getByRole("radio", { checked: true })).toHaveText(
		/Sold/,
	);
	expect((await calls(page)).at(-1)).toEqual({ name: "setArtworkStatus", args: ["alpha", "sold"] });
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);

	const featured = dialog.getByRole("switch", { name: "Featured on home" });
	await featured.click();
	await expect(featured).toHaveAttribute("aria-checked", "true");
	expect((await calls(page)).at(-1)).toEqual({ name: "setArtworkFeatured", args: ["alpha", true] });
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);
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

test("editor delete closes the sheet and removes the piece on success", async ({ page }) => {
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
	await showList(page);
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
	await expect(page.getByText('No pieces match "zzz"')).toBeVisible();
	await page.getByRole("button", { name: "Show all pieces" }).click();
	await expect(page.getByRole("listitem")).toHaveCount(3);
	await expect(
		page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^All/ }),
	).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: /^Reorder Alpha/ })).toBeEnabled();
});

test("a status filter with no pieces names the state", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	await outcome(page, "success");
	await page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^Sold/ }).click();
	await page.getByRole("button", { name: "Delete Charlie" }).click();
	await page
		.getByRole("dialog", { name: 'Delete "Charlie"?' })
		.getByRole("button", { name: "Delete piece" })
		.click();
	await expect(page.getByText("No sold pieces")).toBeVisible();
	await page.getByRole("button", { name: "Show all pieces" }).click();
	await expect(page.getByRole("listitem")).toHaveCount(2);
});

test("empty catalog offers the add sheet", async ({ page }) => {
	await mountAdmin(page, "artworksEmpty");
	await expect(page.getByRole("status")).toContainText("No pieces yet");
	await expect(page.getByRole("status")).toContainText(
		"Add your first painting to open the gallery.",
	);
	await page.getByRole("button", { name: "Add a piece" }).click();
	await expect(page.getByRole("dialog", { name: "New piece" })).toBeVisible();
});

test("filtered initial state from the page shows only matching tiles", async ({ page }) => {
	await mountAdmin(page, "artworksFiltered");
	await expect(page.getByRole("listitem")).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Edit Charlie, position 3, Sold", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("group", { name: "Show" }).getByRole("button", { name: /^Sold/ }),
	).toHaveAttribute("aria-pressed", "true");
});

test("staged order survives a quick state refresh", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await showList(page);
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

// The add-piece sheet form flows live in admin-catalog-add.spec.ts (500-line ceiling).

test("quick states offer Undo in the bottom bar and Undo runs the reverse action once", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await showList(page);
	await outcome(page, "success");
	const bar = page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) });

	await statusGroup(page, "Alpha").getByRole("radio", { name: "Sold" }).click();
	await expect(bar).toContainText('"Alpha" marked as sold');
	await expect(bar.getByRole("button", { name: "Dismiss" })).toBeVisible();
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar).toHaveCount(0);
	expect((await calls(page)).at(-1)).toEqual({
		name: "setArtworkStatus",
		args: ["alpha", "archive"],
	});
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(statusGroup(page, "Alpha").getByRole("radio", { checked: true })).toHaveText(
		/Not for sale/,
	);

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
