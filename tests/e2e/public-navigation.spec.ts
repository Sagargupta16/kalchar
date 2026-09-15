import { expect, test } from "@playwright/test";

test("mobile menu keeps focus inside and closes on the current destination @mobile", async ({
	page,
}) => {
	await page.goto("/work/");
	const trigger = page.getByRole("button", { name: "Open menu" });
	await trigger.click();
	const menu = page.getByRole("dialog", { name: "Site navigation" });
	const navigation = menu.getByRole("navigation", { name: "Primary mobile" });
	await expect(navigation.getByRole("link", { name: /Artwork/ })).toBeFocused();
	await expect(page.locator("#main")).toHaveAttribute("inert", "");

	const home = menu.getByRole("link", { name: "Home", exact: true });
	const whatsapp = menu.getByRole("link", { name: "Message on WhatsApp" });
	await home.focus();
	await page.keyboard.press("Shift+Tab");
	await expect(whatsapp).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(home).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(menu).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await expect(page.locator("#main")).not.toHaveAttribute("inert", "");

	await trigger.click();
	await navigation.getByRole("link", { name: /Artwork/ }).click();
	await expect(menu).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test("resizing an open mobile menu restores the desktop page @mobile", async ({ page }) => {
	await page.setViewportSize({ width: 768, height: 1024 });
	await page.goto("/work/");
	await page.getByRole("button", { name: "Open menu" }).click();
	await expect(page.locator("body")).toHaveCSS("position", "fixed");

	await page.setViewportSize({ width: 1366, height: 900 });
	await expect(page.getByRole("dialog", { name: "Site navigation" })).toHaveCount(0);
	await expect(page.locator("#main")).not.toHaveAttribute("inert", "");
	await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
	await expect(
		page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Artwork" }),
	).toBeFocused();
});

test("theme controls stay in sync when the header changes size", async ({ page }) => {
	await page.setViewportSize({ width: 1366, height: 900 });
	await page.goto("/work/");
	await page.getByRole("button", { name: "Switch to dark theme" }).click();
	await expect(page.locator("html")).toHaveClass(/dark/);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("button", { name: "Switch to light theme" }).click();
	await expect(page.locator("html")).not.toHaveClass(/dark/);
	await page.setViewportSize({ width: 1366, height: 900 });
	await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
});
