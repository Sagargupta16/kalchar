import { expect, type Locator, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

/**
 * The add-piece sheet form (Tier 1c), split from admin-catalog.spec.ts for the
 * 500-line ceiling: camera-roll-first staging, gated primary, chip rail,
 * INR echo, suggestions and the in-sheet success line.
 */

const REJECTED = "Change was rejected.";

const fixtureImage = (name: string) => ({
	name,
	mimeType: "image/jpeg",
	buffer: Buffer.from(`isolated upload fixture ${name}`),
});

test("add sheet form is photo-first and gates the primary on photo and fields", async ({
	page,
}) => {
	await mountAdmin(page, "upload");
	await expect(page.locator("form label").first()).toContainText("Choose a photo");
	await expect(page.getByText("JPG, PNG, or WebP up to 20 MB")).toBeVisible();
	await expect(page.getByText("Fields marked * are required.")).toBeVisible();
	const picker = page.locator('input[name="image"]');
	expect(await picker.evaluate((input: HTMLInputElement) => input.required)).toBe(false);
	const add = page.getByRole("button", { name: "Add piece", exact: true });
	await page.getByLabel("Title *", { exact: true }).fill("Lotus garden");
	// Title, category (preselected) and medium (prefilled) exist, but no photo: still disabled.
	await expect(add).toBeDisabled();

	await picker.setInputFiles(fixtureImage("lotus.jpg"));
	await expect(page.getByLabel("Title *", { exact: true })).toBeFocused();
	// Attached, not visible: the harness has no CSS and the fixture bytes are not a decodable image.
	await expect(page.locator("form img")).toBeAttached();
	await expect(page.getByText("Change photo")).toBeVisible();
	await expect(page.getByText("Photo uploaded.")).toBeVisible();
	await expect(add).toBeEnabled();

	await outcome(page, "success");
	await add.click();
	const output = page.locator("output");
	await expect(output).toContainText('Added "Lotus garden" to the gallery');
	await expect(output.getByRole("link", { name: "View" })).toHaveAttribute(
		"href",
		"/work/created-piece/",
	);
	await expect(output.getByRole("button", { name: "Add another" })).toBeVisible();
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("");
	await expect(picker).toBeFocused();
});

test("add sheet failure keeps the photo and the typed fields", async ({ page }) => {
	await mountAdmin(page, "upload");
	await outcome(page, "failure");
	await page.getByLabel("Title *", { exact: true }).fill("Lotus garden");
	await page.locator('input[name="image"]').setInputFiles(fixtureImage("lotus.jpg"));
	await page.getByRole("button", { name: "Add piece", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText(REJECTED);
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Lotus garden");
	await expect(page.locator("form img")).toBeAttached();
});

test("add sheet primary reads Adding... while pending", async ({ page }) => {
	await mountAdmin(page, "upload");
	await page.getByLabel("Title *", { exact: true }).fill("Lotus garden");
	await page.locator('input[name="image"]').setInputFiles(fixtureImage("lotus.jpg"));
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Add piece", exact: true }).click();
	const busy = page.getByRole("button", { name: "Adding..." });
	await expect(busy).toBeVisible();
	await expect(busy).toHaveAttribute("aria-busy", "true");
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.locator("output")).toContainText('Added "Lotus garden" to the gallery');
});

test("category is a single-select chip rail with the last-used preselected", async ({ page }) => {
	await mountAdmin(page, "upload");
	const rail = page.getByRole("group", { name: "Category" });
	await expect(rail.getByRole("button", { name: "Gond" })).toHaveAttribute("aria-pressed", "true");
	await rail.getByRole("button", { name: "Pichwai" }).click();
	await expect(rail.getByRole("button", { name: "Pichwai" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(rail.getByRole("button", { name: "Gond" })).toHaveAttribute(
		"aria-pressed",
		"false",
	);
});

test("numeric fields keep digits only with the live INR echo", async ({ page }) => {
	await mountAdmin(page, "upload");
	const price = page.getByLabel("Price (optional)", { exact: true });
	await price.fill("1,200");
	await expect(price).toHaveValue("1200");
	await expect(page.getByText("Shows as INR 1,200")).toBeVisible();
	await expect(price).toHaveAttribute("inputmode", "numeric");
	await page.getByText("More details (Year, Dimensions, Description)").click();
	await expect(page.getByLabel("Year (optional)", { exact: true })).toHaveAttribute(
		"inputmode",
		"numeric",
	);
});

test("add form prefills medium and offers datalist suggestions", async ({ page }) => {
	await mountAdmin(page, "upload");
	// An input with a datalist exposes the combobox role.
	const medium = page.getByRole("combobox", { name: "Medium *" });
	await expect(medium).toHaveValue("Ink");
	await expect(medium).toHaveAttribute("required", "");
	const options = async (field: Locator) =>
		field.evaluate((input: HTMLInputElement) => input.list?.options.length ?? -1);
	expect(await options(medium)).toBe(2);
	await page.getByText("More details (Year, Dimensions, Description)").click();
	expect(await options(page.getByRole("combobox", { name: "Dimensions (optional)" }))).toBe(1);
});

test("empty categories point at the Categories page", async ({ page }) => {
	await mountAdmin(page, "uploadEmpty");
	await expect(page.getByRole("link", { name: "Add one in Categories" })).toBeVisible();
});
