import { expect, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

async function openEditor(page: Page) {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: /^Edit Alpha, position 1/ }).click();
	return page.getByRole("dialog", { name: "Edit piece" });
}

const replacement = { name: "replacement.jpg", mimeType: "image/jpeg", buffer: Buffer.from("isolated photo fixture") };

test("filter counts follow optimistic status changes and rollback", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "List view" }).click();
	await outcome(page, "pending");
	await page.getByRole("radiogroup", { name: "Status of Alpha" }).getByRole("radio", { name: "Sold" }).click();
	const filters = page.getByRole("group", { name: "Show" });
	await expect(filters.getByRole("button", { name: /^Sold/ })).toHaveText("Sold2");
	await expect(filters.getByRole("button", { name: /^Not for sale/ })).toHaveText("Not for sale0");
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(filters.getByRole("button", { name: /^Sold/ })).toHaveText("Sold1");
	await expect(filters.getByRole("button", { name: /^Not for sale/ })).toHaveText("Not for sale1");
});

test("a shared save disables other pieces and keeps a failure on its initiating row", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "List view" }).click();
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Feature Alpha", exact: true }).click();
	for (const name of ["Feature Bravo", "Feature Charlie", "Edit Bravo", "Delete Bravo"]) {
		await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
	}
	await expect(page.getByRole("radiogroup", { name: "Status of Bravo" }).getByRole("radio", { name: "Sold" })).toBeDisabled();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	const alpha = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Feature Alpha", exact: true }) });
	const bravo = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Feature Bravo", exact: true }) });
	await expect(alpha.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(bravo.getByRole("alert")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Feature Bravo", exact: true })).toBeEnabled();
	await outcome(page, "success");
	await page.getByRole("button", { name: "Feature Bravo", exact: true }).click();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
	await expect(page.getByRole("button", { name: "Feature Bravo", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("an earlier Undo cannot compete with another piece save", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "List view" }).click();
	await outcome(page, "success");
	await page.getByRole("button", { name: "Feature Alpha", exact: true }).click();
	const undo = page.getByRole("button", { name: "Undo", exact: true });
	await expect(undo).toBeEnabled();
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Feature Bravo", exact: true }).click();
	await expect(undo).toBeDisabled();
	await page.getByRole("button", { name: "Grid view" }).click();
	for (const tile of await page.getByRole("button", { name: /^Edit .+, position/ }).all()) {
		await expect(tile).toBeDisabled();
	}
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(undo).toBeEnabled();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
});

test("Save opens a hidden invalid year and focuses the field", async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.getByText("More details (Year, Dimensions, Description)").click();
	const year = dialog.getByRole("textbox", { name: "Year (optional)" });
	await year.fill("1800");
	await dialog.getByText("More details (Year, Dimensions, Description)").click();
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(year).toBeVisible();
	await expect(year).toBeFocused();
	await expect(dialog.getByText(/Year must be between/)).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("a selected replacement photo survives cancelling a confirmation", async ({ page }) => {
	const dialog = await openEditor(page);
	await dialog.locator('input[name="image"]').setInputFiles(replacement);
	await dialog.getByRole("button", { name: "Delete piece" }).click();
	await dialog.getByRole("button", { name: "Keep piece" }).click();
	await expect(dialog.getByText("replacement.jpg", { exact: true })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(dialog.getByText("replacement.jpg", { exact: true })).toBeVisible();
});

test("Enter saves the edited fields once and immediately updates filter counts", async ({ page }) => {
	const dialog = await openEditor(page);
	await outcome(page, "success");
	await dialog.getByRole("radiogroup", { name: "Status of Alpha" }).getByRole("radio", { name: "Sold" }).click();
	await dialog.getByRole("switch", { name: "Featured on home" }).click();
	const title = dialog.getByRole("textbox", { name: "Title *" });
	await title.fill("Updated Alpha");
	await title.press("Enter");
	await expect(dialog.getByText("Piece updated", { exact: true })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	const calls = await page.evaluate(() => window.adminTest.calls);
	expect(calls).toHaveLength(1);
	expect(calls[0]).toMatchObject({
		name: "updateArtwork",
		args: ["alpha", { title: "Updated Alpha", status: "sold", featured: true }],
	});
	await page.keyboard.press("Escape");
	const filters = page.getByRole("group", { name: "Show" });
	await expect(filters.getByRole("button", { name: /^Sold/ })).toHaveText("Sold2");
	await expect(filters.getByRole("button", { name: /^Featured/ })).toHaveText("Featured2");
	await expect(filters.getByRole("button", { name: /^Not for sale/ })).toHaveText("Not for sale0");
});

test("clearing search returns focus and search supports medium names", async ({ page }) => {
	await mountAdmin(page, "artworks");
	const search = page.getByRole("searchbox", { name: "Find a piece" });
	await search.fill("bra");
	await expect(page.getByRole("listitem")).toHaveCount(1);
	await page.getByRole("button", { name: "Clear search" }).click();
	await expect(search).toBeFocused();
	await expect(search).toHaveValue("");
	await search.fill(" INK ");
	await expect(page.getByRole("listitem")).toHaveCount(3);
});

test("deleting the last matching piece updates counts and ignores blank search text", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "List view" }).click();
	const filters = page.getByRole("group", { name: "Show" });
	await filters.getByRole("button", { name: /^Sold/ }).click();
	await page.getByRole("searchbox", { name: "Find a piece" }).fill(" ");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Delete Charlie" }).click();
	await page.getByRole("dialog", { name: 'Delete "Charlie"?' }).getByRole("button", { name: "Delete piece" }).click();
	await expect(page.getByText("No sold pieces", { exact: true })).toBeVisible();
	await expect(filters.getByRole("button", { name: /^Sold/ })).toHaveText("Sold0");
	await expect(filters.getByRole("button", { name: /^All/ })).toHaveText("All2");
});

test("a quick-action error remains visible after switching to the grid", async ({ page }) => {
	await mountAdmin(page, "artworks");
	await page.getByRole("button", { name: "List view" }).click();
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Feature Alpha" }).click();
	await page.getByRole("button", { name: "Grid view" }).click();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.getByRole("button", { name: "Edit Alpha, position 1, Not for sale", exact: true })).toBeVisible();
});

test("a replacement can be removed and the same file selected again", async ({ page }) => {
	const dialog = await openEditor(page);
	const input = dialog.locator('input[name="image"]');
	await input.setInputFiles(replacement);
	await expect(input).toHaveValue("");
	await dialog.getByRole("button", { name: "Remove selected image" }).click();
	await expect(dialog.getByText("replacement.jpg", { exact: true })).toHaveCount(0);
	await input.setInputFiles(replacement);
	await expect(dialog.getByText("replacement.jpg", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

for (const price of ["0", "99999999999999999"]) {
	test(`editor rejects invalid price ${price} before any action`, async ({ page }) => {
		const dialog = await openEditor(page);
		const field = dialog.getByRole("textbox", { name: "Price in INR (optional)" });
		await field.fill(price);
		await dialog.getByRole("button", { name: "Save changes" }).click();
		await expect(field).toBeFocused();
		await expect(field).toHaveAttribute("aria-invalid", "true");
		await expect(dialog.getByText("Enter a price above zero, or leave it blank if it is not for sale.")).toBeVisible();
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
	});
}
