import { expect, test } from "@playwright/test";
import {
	hasUnsavedWarning,
	mountCategories,
	categoryOutcome as outcome,
} from "../admin/categories/browser-fixture";

test("categories: another move immediately after saving offers Save order again", async ({
	page,
}) => {
	await mountCategories(page);
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).press("ArrowDown");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Save order" }).click();
	await expect(page.getByText("Order saved", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Reorder Alpha, position 2 of 3" }).press("End");
	await expect(page.getByRole("button", { name: "Save order" })).toBeVisible({ timeout: 1000 });
	await page.getByRole("button", { name: "Save order" }).click();
	expect(await page.evaluate(() => window.adminTest.calls.at(-1)?.args)).toEqual([
		["Bravo", "Charlie", "Alpha"],
	]);
});

test("categories: refreshed names and new rows preserve the staged order", async ({ page }) => {
	await mountCategories(page);
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).press("ArrowDown");
	await page.evaluate(() =>
		window.mountCategories([
			{ id: "Alpha", name: "Alpha renamed", order: 0 },
			{ id: "Bravo", name: "Bravo", order: 1 },
			{ id: "Charlie", name: "Charlie", order: 2 },
			{ id: "Delta", name: "Delta", order: 3 },
		]),
	);
	await expect(
		page.getByRole("button", { name: "Reorder Alpha renamed, position 2 of 4" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order" })).toBeVisible();
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Reorder Alpha renamed, position 1 of 4" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
});

test("categories: moving back to the saved position allows later server orders to refresh", async ({
	page,
}) => {
	await mountCategories(page);
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).press("ArrowDown");
	await page.getByRole("button", { name: "Reorder Alpha, position 2 of 3" }).press("ArrowUp");
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
	await page.evaluate(() =>
		window.mountCategories([
			{ id: "Bravo", name: "Bravo", order: 0 },
			{ id: "Alpha", name: "Alpha", order: 1 },
			{ id: "Charlie", name: "Charlie", order: 2 },
		]),
	);
	await expect(page.getByRole("button", { name: "Reorder Bravo, position 1 of 3" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
});

test("categories: rename failures stay beside the draft and retry keeps its value", async ({
	page,
}) => {
	await mountCategories(page);
	const row = page.getByRole("listitem").nth(1);
	await row.getByRole("button", { name: "Rename Bravo" }).click();
	const name = row.getByRole("textbox", { name: "Rename Bravo" });
	await name.fill("New Bravo");
	await name.press("Enter");
	await expect(row.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(name).toHaveValue("New Bravo");
	await expect(page.getByRole("form", { name: "Add a category" }).getByRole("alert")).toHaveCount(
		0,
	);
	await outcome(page, "success");
	await name.press("Enter");
	await expect(page.getByRole("button", { name: "Rename New Bravo" })).toBeFocused();
});

test("categories: Escape returns focus and unchanged names do not submit", async ({ page }) => {
	await mountCategories(page);
	const rename = page.getByRole("button", { name: "Rename Alpha" });
	await rename.click();
	await page.getByRole("textbox", { name: "Rename Alpha" }).press("Escape");
	await expect(rename).toBeFocused();
	await rename.click();
	await page.getByRole("textbox", { name: "Rename Alpha" }).press("Enter");
	await expect(rename).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("categories: blank rename explains the error without sending a request", async ({ page }) => {
	await mountCategories(page);
	const row = page.getByRole("listitem").first();
	await row.getByRole("button", { name: "Rename Alpha" }).click();
	const name = row.getByRole("textbox", { name: "Rename Alpha" });
	await name.fill("   ");
	await name.press("Enter");
	await expect(row.getByRole("alert")).toHaveText("Enter a category name");
	await expect(name).toHaveAttribute("aria-invalid", "true");
	await expect(name).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("categories: create and rename drafts warn before leaving until saved or cancelled", async ({
	page,
}) => {
	await mountCategories(page);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	const newName = page.getByRole("textbox", { name: "Category name", exact: true });
	await newName.fill("Warli");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await outcome(page, "failure");
	await page.getByRole("button", { name: "Add category" }).click();
	await expect(newName).toHaveValue("Warli");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await outcome(page, "success");
	await page.getByRole("button", { name: "Add category" }).click();
	await expect(newName).toHaveValue("");
	await expect(newName).toBeFocused();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await page.getByRole("button", { name: "Rename Alpha" }).click();
	await page.getByRole("textbox", { name: "Rename Alpha" }).fill("Draft Alpha");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await page.getByRole("button", { name: "Cancel renaming Alpha" }).click();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

test("categories: pending rename is marked busy and duplicate submissions are blocked", async ({
	page,
}) => {
	await mountCategories(page);
	await page.getByRole("button", { name: "Rename Alpha" }).click();
	await page.getByRole("textbox", { name: "Rename Alpha" }).fill("New Alpha");
	await outcome(page, "pending");
	const save = page.getByRole("button", { name: "Save Alpha" });
	await save.click();
	await expect(save).toHaveAttribute("aria-busy", "true");
	await expect(save).toBeDisabled();
	await expect(page.getByRole("textbox", { name: "Rename Alpha" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Add category" })).toBeDisabled();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
	await outcome(page, "throw");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("listitem").first().getByRole("alert")).toHaveText(
		"Connection interrupted.",
	);
});

test("categories: deletion stays pending in its dialog and failures can be retried there", async ({
	page,
}) => {
	await mountCategories(page);
	await page.getByRole("button", { name: "Delete Alpha", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: 'Delete category "Alpha"?' });
	await outcome(page, "pending");
	const remove = dialog.getByRole("button", { name: "Delete category", exact: true });
	await remove.click();
	await expect(remove).toBeDisabled();
	await expect(remove).toHaveAttribute("aria-busy", "true");
	await expect(dialog.getByRole("button", { name: "Keep category" })).toBeDisabled();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(remove).toBeEnabled();
	await outcome(page, "success");
	await remove.click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Delete Alpha", exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Rename Bravo" })).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
});

test("categories: empty list accepts its first category and keeps failed drafts", async ({
	page,
}) => {
	await mountCategories(page);
	await page.evaluate(() => window.mountCategories([]));
	await expect(page.getByText("No categories yet")).toBeVisible();
	const name = page.getByRole("textbox", { name: "Category name", exact: true });
	await name.fill("Warli");
	await page.getByRole("button", { name: "Add category" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(name).toHaveValue("Warli");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Add category" }).click();
	await page.evaluate(() => window.mountCategories([{ id: "warli", name: "Warli", order: 0 }]));
	await expect(page.getByText("No categories yet")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Rename Warli" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
});

test.describe("categories layout @preview", () => {
	test.skip(process.env.KALCHAR_ADMIN_PREVIEW !== "1", "uses the running safe preview");
	for (const width of [320, 390, 1280]) {
		test.describe(`${width}px`, () => {
			test.use({
				viewport: { width, height: 844 },
				isMobile: width < 640,
				hasTouch: width < 640,
			});

			test("controls and inline edits fit", async ({ page }) => {
				await page.goto("http://localhost:3010/admin/categories");
				await expect(page.getByRole("heading", { name: "Categories", exact: true })).toBeVisible();
				const row = page
					.getByRole("list")
					.filter({ has: page.getByRole("button", { name: /^Rename / }) })
					.getByRole("listitem")
					.first();
				await expect(row).toBeVisible();
				expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
					true,
				);
				if (width < 640) {
					const moveDown = row.getByRole("button", { name: /^Move .+ down$/ });
					await expect(moveDown).toBeVisible();
					await moveDown.tap();
					await expect(page.getByRole("button", { name: "Save order" })).toBeVisible();
					await page.getByRole("button", { name: "Reset", exact: true }).tap();
					await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
				}
				await page.screenshot({
					path: `.cache/admin-categories/categories-${width}.png`,
					fullPage: true,
				});
				await row.getByRole("button", { name: /^Rename / }).click();
				await expect(row.getByRole("textbox")).toBeFocused();
				expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
					true,
				);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
					),
				).toBe(true);
				for (const button of await row.getByRole("button").all()) {
					const bounds = await button.boundingBox();
					expect(bounds?.width).toBeGreaterThanOrEqual(44);
					expect(bounds?.height).toBeGreaterThanOrEqual(44);
				}
				await page.screenshot({
					path: `.cache/admin-categories/categories-edit-${width}.png`,
					fullPage: true,
				});
				await row.getByRole("textbox").press("Escape");
				await expect(row.getByRole("button", { name: /^Rename / })).toBeFocused();
			});
		});
	}
});
