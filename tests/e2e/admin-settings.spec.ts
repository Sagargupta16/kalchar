import { expect, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const fixtureImage = {
	name: "fixture.jpg",
	mimeType: "image/jpeg",
	buffer: Buffer.from("isolated upload fixture"),
};

// The lead cases moved to admin-leads.spec.ts when the enquiry card became a
// DM inbox row with its status and reply actions inside the detail sheet
// (visual-direction-admin Tier 2a).

test("categories: blank submit explains, success confirms, rename submits on Enter", async ({
	page,
}) => {
	await mountAdmin(page, "categories");
	const field = page.getByLabel("Category name");
	await field.fill("   ");
	await page.getByRole("button", { name: "Add category" }).click();
	await expect(page.getByText("Enter a category name")).toBeVisible();
	await expect(field).toHaveAttribute("aria-invalid", "true");
	await outcome(page, "success");
	await field.fill("Warli");
	await page.getByRole("button", { name: "Add category" }).click();
	await expect(page.locator("output")).toContainText('Added "Warli" at the end of the list.');
	await page.getByRole("button", { name: "Rename Alpha" }).click();
	await page.getByRole("textbox", { name: "Rename Alpha" }).fill("Alpha 2");
	await page.getByRole("textbox", { name: "Rename Alpha" }).press("Enter");
	await expect(page.getByRole("textbox", { name: "Rename Alpha" })).toHaveCount(0);
	const last = (await page.evaluate(() => window.adminTest.calls)).at(-1);
	expect(last?.name).toBe("renameCategory");
	expect(last?.args).toEqual(["Alpha", "Alpha 2"]);
	await page.getByRole("button", { name: "Rename Bravo" }).click();
	await page.getByRole("textbox", { name: "Rename Bravo" }).press("Escape");
	await expect(page.getByRole("textbox", { name: "Rename Bravo" })).toHaveCount(0);
	await expect(page.getByText("Bravo")).toBeVisible();
});

test("categories: the in-use guard is visible text", async ({ page }) => {
	await mountAdmin(page, "categoriesInUse");
	const alpha = page.getByRole("listitem").first();
	await expect(alpha.getByText("2 pieces, in use")).toBeVisible();
	await expect(alpha.getByRole("button", { name: "Delete Alpha" })).toBeDisabled();
	const bravo = page.getByRole("listitem").nth(1);
	await expect(bravo.getByText("0 pieces")).toBeVisible();
	await expect(bravo.getByRole("button", { name: "Delete Bravo" })).toBeEnabled();
});

test("presets: Save order is the primary control and reports Saved", async ({ page }) => {
	await mountAdmin(page, "presets");
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).focus();
	await page.keyboard.press("ArrowDown");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Save order" }).click();
	await expect(page.locator("output")).toHaveText("Order saved");
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
	const last = (await page.evaluate(() => window.adminTest.calls)).at(-1);
	expect(last?.name).toBe("reorderOrderPresets");
	expect(last?.args.at(-1)).toEqual(["Bravo", "Alpha", "Charlie"]);
});

test("presets: verbs are Rename and Delete", async ({ page }) => {
	await mountAdmin(page, "presets");
	await expect(page.getByRole("button", { name: "Rename Alpha" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Delete Alpha" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Remove Alpha" })).toHaveCount(0);
	const field = page.getByLabel("New size option");
	await expect(field).toBeVisible();
	await expect(page.getByRole("button", { name: "Add size" })).toBeVisible();
	await field.fill("   ");
	await page.getByRole("button", { name: "Add size" }).click();
	await expect(page.getByText("Enter a size option")).toBeVisible();
	await expect(field).toHaveAttribute("aria-invalid", "true");
});

test("maintainers: the roster truncates instead of clipping and Root shows once", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await mountAdmin(page, "maintainers");
	const remove = page.getByRole("button", { name: "Remove bravo@example.invalid" });
	const removeBox = await remove.boundingBox();
	const listBox = await page.getByRole("list").boundingBox();
	expect(removeBox).not.toBeNull();
	expect(listBox).not.toBeNull();
	expect(removeBox!.x + removeBox!.width).toBeLessThanOrEqual(listBox!.x + listBox!.width + 1);
	await expect(page.getByText("Root", { exact: true })).toHaveCount(1);
	await expect(page.getByText("Root maintainer")).toHaveCount(0);
});

test("maintainers: duplicates are caught before the action and success names the next step", async ({
	page,
}) => {
	await mountAdmin(page, "maintainers");
	const email = page.getByLabel("Google email");
	await email.fill("bravo@example.invalid");
	await page.getByRole("button", { name: "Add maintainer" }).click();
	await expect(page.getByText("bravo@example.invalid already has access.")).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(0);
	await outcome(page, "success");
	await email.fill("new@example.invalid");
	await page.getByRole("button", { name: "Add maintainer" }).click();
	await expect(page.locator("output")).toContainText(
		"new@example.invalid can now sign in with Google at kalchar.co.in/admin.",
	);
	await outcome(page, "failure");
	await email.fill("again@example.invalid");
	await page.getByRole("button", { name: "Add maintainer" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(email).toHaveValue("again@example.invalid");
});

test("maintainers: removing yourself gets its own warning", async ({ page }) => {
	await mountAdmin(page, "maintainersSelf");
	await expect(page.getByRole("button", { name: "Remove root@example.invalid" })).toHaveCount(0);
	await page.getByRole("button", { name: "Remove bravo@example.invalid" }).click();
	const dialog = page.getByRole("dialog", { name: "Remove your own access?" });
	await expect(dialog.getByRole("button", { name: "Remove my access" })).toBeVisible();
	await dialog.getByRole("button", { name: "Keep my access" }).click();
	await expect(page.getByRole("button", { name: "Remove bravo@example.invalid" })).toBeVisible();
});

test("profile: choosing a file shows a preview and a labelled upload button", async ({ page }) => {
	await mountAdmin(page, "profile");
	await page.locator('input[name="image"]').setInputFiles(fixtureImage);
	await expect(page.getByText("Change photo")).toBeVisible();
	await expect(page.getByText("fixture.jpg")).toBeVisible();
	const upload = page.getByRole("button", { name: "Upload photo" });
	await expect(upload).toBeVisible();
	await outcome(page, "pending");
	await upload.click();
	// The label never becomes the file name and never relabels while pending.
	await expect(upload).toHaveText("Upload photo");
	await expect(page.locator('form[aria-busy="true"]')).toHaveCount(1);
	// Tier 2f: while the server prepares variants, the progress ring around the
	// portrait is the progressbar, named by the honest stage label.
	await expect(
		page.getByRole("progressbar", { name: "Preparing sizes for phones and desktops" }),
	).toBeVisible();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(
		page.getByRole("region", { name: "Profile photo" }).getByRole("alert"),
	).toHaveText("Change was rejected.");
	await expect(page.getByText("fixture.jpg")).toBeVisible();
});

test("profile: the intro switch flips at once and reverts on failure", async ({ page }) => {
	await mountAdmin(page, "profile");
	await outcome(page, "pending");
	const toggle = page.getByRole("switch", { name: "Show artist intro on home" });
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-checked", "true");
	await page.evaluate(() => window.adminTest.release?.());
	await mountAdmin(page, "profile");
	await outcome(page, "failure");
	await page.getByRole("switch", { name: "Show artist intro on home" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.getByRole("switch", { name: "Show artist intro on home" })).toHaveAttribute(
		"aria-checked",
		"false",
	);
});

const confirms = [
	{
		view: "categories",
		button: "Delete Alpha",
		title: 'Delete category "Alpha"?',
		confirm: "Delete category",
		keep: "Keep category",
	},
	{
		view: "presets",
		button: "Delete Alpha",
		title: 'Delete "Alpha"?',
		confirm: "Delete option",
		keep: "Keep option",
	},
	{
		view: "profile",
		button: "Remove photo",
		title: "Remove profile photo?",
		confirm: "Remove photo",
		keep: "Keep photo",
	},
] as const;

for (const c of confirms) {
	test(`confirms use outcome labels: ${c.view}`, async ({ page }) => {
		await mountAdmin(page, c.view);
		await page.getByRole("button", { name: c.button, exact: true }).click();
		const dialog = page.getByRole("dialog", { name: c.title });
		await expect(dialog.getByRole("button", { name: c.confirm, exact: true })).toBeVisible();
		await expect(dialog.getByRole("button", { name: c.keep, exact: true })).toBeVisible();
		for (const banned of ["Cancel", "OK", "Yes"]) {
			await expect(dialog.getByRole("button", { name: banned, exact: true })).toHaveCount(0);
		}
		await dialog.getByRole("button", { name: c.keep, exact: true }).click();
		await expect(page.getByRole("button", { name: c.button, exact: true })).toBeVisible();
	});
}

test("categories and presets: the add control is a chip pill with an icon-only submit", async ({
	page,
}) => {
	await mountAdmin(page, "categories");
	const categoryField = page.getByLabel("Category name");
	await expect(categoryField).toHaveAttribute("placeholder", "New category");
	// Icon-only round submit: the accessible name comes from aria-label alone.
	await expect(page.getByRole("button", { name: "Add category" })).toHaveText("");
	await mountAdmin(page, "presets");
	await expect(page.getByLabel("New size option")).toHaveAttribute("placeholder", "New size");
	await expect(page.getByRole("button", { name: "Add size" })).toHaveText("");
});

test("presets: the preview strip mirrors the group order through a reorder save", async ({
	page,
}) => {
	await mountAdmin(page, "presets");
	const strip = page
		.locator('div[aria-hidden="true"]')
		.filter({ hasText: "How the order form shows them" });
	await expect(strip).toHaveCount(1);
	await expect(strip).toHaveText(/Alpha.*Bravo.*Charlie/);
	await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
	await expect(strip).toHaveText(/Bravo.*Alpha.*Charlie/);
	await outcome(page, "success");
	await page.getByRole("button", { name: "Save order" }).click();
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
	await expect(strip).toHaveText(/Bravo.*Alpha.*Charlie/);
});

test("maintainers: roster rows lead with an initials disc", async ({ page }) => {
	await mountAdmin(page, "maintainers");
	const rows = page.getByRole("listitem");
	// Root has the name "Root" -> "R"; bravo has no name -> "B" from the email.
	await expect(rows.nth(0).locator('span[aria-hidden="true"]').first()).toHaveText("R");
	await expect(rows.nth(1).locator('span[aria-hidden="true"]').first()).toHaveText("B");
});

test("profile: the intro switch offers Undo and Undo restores the value", async ({ page }) => {
	await mountAdmin(page, "profile");
	await outcome(page, "success");
	await page.getByRole("switch", { name: "Show artist intro on home" }).click();
	const bar = page.locator(".fixed");
	await expect(bar.getByText("Home intro shown")).toBeVisible();
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar).toHaveCount(0);
	const last = (await page.evaluate(() => window.adminTest.calls)).at(-1);
	expect(last?.name).toBe("setShowHomeIntro");
	expect(last?.args).toEqual([false]);
});
