import { expect, type Page, test } from "@playwright/test";
import { mountAdmin } from "../admin/browser-fixture";

async function openCategories(page: Page) {
	await page.route("http://admin-ui.test/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<html><body>Destination page</body></html>" }),
	);
	await page.goto("http://admin-ui.test/admin/categories");
	await mountAdmin(page, "categories");
	await page.evaluate(() => {
		const link = document.createElement("a");
		link.href = "/admin/events";
		link.textContent = "Events page";
		link.style.cssText = "display: block; padding: 12px 24px";
		document.body.prepend(link);
	});
	return page.getByRole("link", { name: "Events page" });
}

test("admin navigation keeps an unsent form until leaving is confirmed", async ({ page }) => {
	const destination = await openCategories(page);
	const name = page.getByRole("textbox", { name: "Category name" });
	await name.fill("New tradition");
	await destination.click();
	const confirmation = page.getByRole("dialog", { name: "Leave without saving?" });
	await expect(confirmation).toBeVisible();
	await confirmation.getByRole("button", { name: "Keep editing" }).click();
	await expect(confirmation).toHaveCount(0);
	await expect(name).toHaveValue("New tradition");
	await expect(destination).toBeFocused();
	await expect(page).toHaveURL("http://admin-ui.test/admin/categories");

	await destination.click();
	await confirmation.getByRole("button", { name: "Leave page" }).click();
	await expect(confirmation).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.pathname)).toBe("/admin/events");
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("several admin drafts produce one navigation confirmation", async ({ page }) => {
	const destination = await openCategories(page);
	await page.getByRole("textbox", { name: "Category name" }).fill("New tradition");
	await page.getByRole("button", { name: "Rename Alpha", exact: true }).click();
	const rename = page.getByRole("textbox", { name: "Rename Alpha", exact: true });
	await rename.fill("Updated tradition");
	await destination.click();
	await expect(page.getByRole("dialog")).toHaveCount(1);
	await page.getByRole("button", { name: "Keep editing", exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(rename).toHaveValue("Updated tradition");
});

test("staged ordering is protected when navigating to another admin page", async ({ page }) => {
	const destination = await openCategories(page);
	await page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" }).press("ArrowDown");
	await destination.click();
	await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Save order" })).toBeVisible();
});

test("clearing a draft permits navigation without a confirmation", async ({ page }) => {
	const destination = await openCategories(page);
	const name = page.getByRole("textbox", { name: "Category name" });
	await name.fill("Temporary draft");
	await name.fill("");
	await destination.click();
	await expect(page).toHaveURL("http://admin-ui.test/admin/events");
	await expect(page.getByRole("dialog")).toHaveCount(0);
});
