import { expect, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const fixtureImage = {
	name: "fixture.jpg",
	mimeType: "image/jpeg",
	buffer: Buffer.from("isolated upload fixture"),
};

test("leads: status chip, sentence-case options and the email reply link", async ({ page }) => {
	await mountAdmin(page, "leads");
	const card = page.getByRole("listitem").first();
	await expect(card.locator("span").filter({ hasText: /^New$/ })).toBeVisible();
	const labels = await page.getByLabel("Lead status").locator("option").allTextContents();
	expect(labels).toEqual(["New", "Contacted", "Closed"]);
	await expect(page.getByRole("link", { name: "Email" })).toHaveAttribute(
		"href",
		/^mailto:mira@example\.invalid\?subject=/,
	);
	await expect(page.getByRole("link", { name: "Reply on WhatsApp" })).toHaveCount(0);
});

test("leads: filter chips count the page and the filtered empty state offers Show all", async ({
	page,
}) => {
	await mountAdmin(page, "leads");
	const group = page.getByRole("group", { name: "Filter enquiries" });
	for (const name of ["All 1", "New 1", "Contacted 0", "Closed 0"]) {
		await expect(group.getByRole("button", { name, exact: true })).toBeVisible();
	}
	await expect(group.getByRole("button", { name: "All 1", exact: true })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await group.getByRole("button", { name: "Closed 0", exact: true }).click();
	await expect(page.getByText("No closed enquiries on this page.")).toBeVisible();
	await page.getByRole("button", { name: "Show all" }).click();
	await expect(page.getByRole("listitem").first()).toBeVisible();
});

test("leads: a rejected status change reports inside the card", async ({ page }) => {
	await mountAdmin(page, "leads");
	await outcome(page, "failure");
	await page.getByLabel("Lead status").selectOption("contacted");
	await expect(page.getByRole("listitem").first().getByRole("alert")).toHaveText(
		"Change was rejected.",
	);
	await expect(page.getByLabel("Lead status")).toHaveValue("new");
});

test("leads: the timestamp shows date and time", async ({ page }) => {
	await mountAdmin(page, "leads");
	// Fixture createdAt "2026-09-01" parses as UTC midnight, 05:30 IST; the
	// month prefix covers ICU printing "Sep" or "Sept" for en-IN.
	await expect(page.getByRole("listitem").first()).toContainText(/1 Sep\w* 2026, 05:30 am/);
});

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
		view: "leads",
		button: "Delete enquiry from Mira",
		title: "Delete the enquiry from Mira?",
		confirm: "Delete enquiry",
		keep: "Keep enquiry",
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

test("leads: a status change offers Undo and Undo restores the previous status", async ({
	page,
}) => {
	await mountAdmin(page, "leads");
	await outcome(page, "success");
	await page.getByLabel("Lead status").selectOption("contacted");
	const bar = page.locator(".fixed");
	await expect(bar.getByText("Enquiry from Mira marked contacted")).toBeVisible();
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar).toHaveCount(0);
	const afterUndo = (await page.evaluate(() => window.adminTest.calls)).at(-1);
	expect(afterUndo?.name).toBe("setLeadStatus");
	expect(afterUndo?.args).toEqual(["lead-1", "new"]);
	// Dismiss leaves the offer without calling anything. The harness never
	// refreshes props, so the local status is still "contacted" here.
	await page.getByLabel("Lead status").selectOption("new");
	await expect(bar.getByText("Enquiry from Mira marked new")).toBeVisible();
	const count = await page.evaluate(() => window.adminTest.calls.length);
	await bar.getByRole("button", { name: "Dismiss" }).click();
	await expect(bar).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(count);
	// A rejected undo reports inside the bar and the bar stays.
	await page.getByLabel("Lead status").selectOption("closed");
	await expect(bar.getByText("Enquiry from Mira marked closed")).toBeVisible();
	await outcome(page, "failure");
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(bar).toHaveCount(1);
});
