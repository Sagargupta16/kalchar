import { expect, test } from "@playwright/test";
import { mountAdmin, navigateTo, outcome } from "../admin/browser-fixture";

test("More sheet opens as a dialog, closes on the scrim and returns focus", async ({ page }) => {
	await mountAdmin(page, "nav");
	const more = page.getByRole("button", { name: "More", exact: true });
	await expect(more).toHaveAttribute("aria-haspopup", "dialog");
	await more.click();
	await expect(more).toHaveAttribute("aria-expanded", "true");
	const sheet = page.getByRole("dialog", { name: "More tools" });
	await expect(sheet).toBeVisible();
	await expect(sheet).toContainText("megha@example.invalid");
	const control = await page.getByRole("button", { name: "Page control" }).boundingBox();
	await page.mouse.click(control!.x + control!.width / 2, control!.y + control!.height / 2);
	await expect(page.locator("output")).toHaveText("0");
	await expect(sheet).toHaveCount(0);
	await expect(more).toHaveAttribute("aria-expanded", "false");
	await expect(more).toBeFocused();
});

test("More sheet closes on Escape and on a route change", async ({ page }) => {
	await mountAdmin(page, "nav");
	const more = page.getByRole("button", { name: "More", exact: true });
	const sheet = page.getByRole("dialog", { name: "More tools" });
	await more.click();
	await expect(sheet).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(sheet).toHaveCount(0);
	await expect(more).toBeFocused();
	await more.click();
	await expect(sheet).toBeVisible();
	await navigateTo(page, "/admin/events");
	await expect(sheet).toHaveCount(0);
	await more.click();
	await sheet.getByRole("link", { name: "Categories", exact: true }).click();
	await expect(sheet).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.pathname)).toBe("/admin/categories");
});

test("active tab re-tap scrolls to top instead of navigating", async ({ page }) => {
	await mountAdmin(page, "nav");
	await page.evaluate(() => {
		document.body.style.height = "3000px";
		window.scrollTo(0, 800);
	});
	expect(await page.evaluate(() => window.scrollY)).toBe(800);
	await page.getByRole("link", { name: "Pieces", exact: true }).click();
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	expect(await page.evaluate(() => window.adminTest.pathname)).toBe("/admin");
});

test("Enquiries tab carries the count in its name only when given", async ({ page }) => {
	await mountAdmin(page, "navBadged");
	await expect(page.getByRole("link", { name: "Enquiries, 3 new", exact: true })).toBeVisible();
	await mountAdmin(page, "nav");
	await expect(page.getByRole("link", { name: "Enquiries", exact: true })).toBeVisible();
	await expect(page.locator("nav [aria-hidden='true']", { hasText: "3" })).toHaveCount(0);
});

test("sheet modal shows X first, the action while dirty, and an inline confirm step", async ({
	page,
}) => {
	await mountAdmin(page, "dialogs");
	await page.getByRole("button", { name: "Open sheet" }).click();
	const sheet = page.getByRole("dialog", { name: "Edit piece" });
	await expect(sheet).toBeVisible();
	await expect(sheet.getByRole("button", { name: "Close", exact: true })).toBeFocused();
	await expect(sheet.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	await sheet.getByLabel("Draft", { exact: true }).fill("Lotus");
	await expect(sheet.getByRole("button", { name: "Save changes" })).toBeVisible();
	await sheet.getByRole("button", { name: "Delete draft", exact: true }).click();
	await expect(page.locator("dialog[open]")).toHaveCount(1);
	await expect(sheet.getByRole("button", { name: "Keep piece" })).toBeFocused();
	await expect(sheet.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	await outcome(page, "failure");
	await sheet.getByRole("button", { name: "Delete piece" }).click();
	await expect(sheet.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.locator("dialog[open]")).toHaveCount(1);
	await expect(sheet.getByRole("button", { name: "Delete piece" })).toBeEnabled();
	await expect(sheet.getByRole("button", { name: "Keep piece" })).toBeEnabled();
	await page.keyboard.press("Escape");
	await expect(sheet.getByLabel("Draft", { exact: true })).toHaveValue("Lotus");
	await page.keyboard.press("Escape");
	await expect(page.locator("dialog[open]")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Open sheet" })).toBeFocused();
});

test("confirm with an action stays open on failure and resolves true on success", async ({
	page,
}) => {
	await mountAdmin(page, "dialogs");
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Delete with action" }).click();
	const dialog = page.getByRole("dialog", { name: "Delete draft?" });
	const remove = dialog.getByRole("button", { name: "Delete draft", exact: true });
	await remove.click();
	await expect(remove).toHaveAttribute("aria-busy", "true");
	await expect(remove).toBeDisabled();
	await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(dialog.getByRole("alert")).toHaveText(
		"Something went wrong. Refresh and try again.",
	);
	await expect(dialog).toBeVisible();
	await expect(remove).toBeEnabled();
	await expect(dialog.getByRole("button", { name: "Cancel" })).toBeEnabled();
	await outcome(page, "success");
	await remove.click();
	await expect(dialog).toHaveCount(0);
	await expect(page.locator("output")).toHaveText("confirmed: true");
});

test("ReorderBar shows its error inside the bar and keeps the Save label while pending", async ({
	page,
}) => {
	await mountAdmin(page, "bars");
	await page.getByRole("button", { name: "Show bar" }).click();
	const bar = page.locator(".fixed");
	await expect(bar.getByText("Gallery order changed")).toBeVisible();
	await page.getByRole("button", { name: "Set error" }).click();
	await expect(page.getByRole("alert")).toHaveCount(1);
	await expect(bar.getByRole("alert")).toHaveText("Change was rejected.");
	await page.getByRole("button", { name: "Set pending" }).click();
	const save = page.getByRole("button", { name: "Save order" });
	await expect(save).toBeDisabled();
	await expect(save).toHaveAttribute("aria-busy", "true");
	await page.getByRole("button", { name: "Set saved" }).click();
	await expect(bar.locator("output")).toHaveText("Order saved");
	await expect(save).toHaveCount(0);
});

test("InlineReorderControls mirror the bar", async ({ page }) => {
	await mountAdmin(page, "bars");
	await page.getByRole("button", { name: "Show inline" }).click();
	await page.getByRole("button", { name: "Set inline error" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await page.getByRole("button", { name: "Set inline pending" }).click();
	const save = page.getByRole("button", { name: "Save order" });
	await expect(save).toBeDisabled();
	await expect(save).toHaveAttribute("aria-busy", "true");
	await page.getByRole("button", { name: "Set inline saved" }).click();
	await expect(page.locator("output")).toHaveText("Order saved");
	await expect(page.getByRole("alert")).toHaveCount(0);
});

test("UndoBar offers one undo, pauses on hover, dismisses on time and on route change", async ({
	page,
}) => {
	await mountAdmin(page, "bars");
	const mark = page.getByRole("button", { name: "Mark Alpha sold" });
	const bar = page.getByRole("status");
	await mark.click();
	await expect(bar).toContainText('"Alpha" marked as sold');
	await expect(bar.getByRole("button", { name: "Undo" })).toBeVisible();
	await expect(bar.getByRole("button", { name: "Dismiss" })).toBeVisible();
	await bar.hover();
	await page.waitForTimeout(600);
	await expect(bar).toBeVisible();
	await page.mouse.move(0, 0);
	await expect(bar).toHaveCount(0, { timeout: 1000 });
	await mark.click();
	await expect(bar).toBeVisible();
	await navigateTo(page, "/admin/events");
	await expect(bar).toHaveCount(0);
	await page.evaluate(() => {
		window.adminTest.undoDuration = 10_000;
	});
	await outcome(page, "failure");
	await mark.click();
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(bar).toBeVisible();
	await outcome(page, "success");
	await bar.getByRole("button", { name: "Undo" }).click();
	await expect(bar).toHaveCount(0);
	const lastCall = (await page.evaluate(() => window.adminTest.calls)).at(-1);
	expect(lastCall).toEqual({ name: "setArtworkStatus", args: ["alpha", "available"] });
});

test("useOptimisticAction flips at once and reverts on failure", async ({ page }) => {
	await mountAdmin(page, "optimistic");
	const toggle = page.getByRole("button", { name: "Feature Alpha" });
	await outcome(page, "pending");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(0);
});
