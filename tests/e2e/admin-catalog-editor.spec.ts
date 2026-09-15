import { expect, type Page, test } from "@playwright/test";
import { DUR } from "../../lib/motion";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const calls = (page: Page) => page.evaluate(() => window.adminTest.calls);
const EXIT_DURATION_MS = DUR.fast * 1000;

async function editPiece(page: Page, title: string) {
	await page.getByRole("button", { name: new RegExp(`^Edit ${title}, position`) }).click();
	const dialog = page.getByRole("dialog", { name: "Edit piece" });
	await expect(dialog).toBeVisible();
	return dialog;
}

for (const title of ["Bravo", "Charlie"]) {
	test(`Not for sale clears ${title}'s price in the draft and saves both after a failed attempt`, async ({
		page,
	}) => {
		await mountAdmin(page, "artworks");
		const dialog = await editPiece(page, title);
		const price = dialog.getByRole("textbox", { name: "Price in INR (optional)" });
		const status = dialog.getByRole("radiogroup", { name: `Status of ${title}` });
		const featured = dialog.getByRole("switch", { name: "Featured on home" });
		const save = dialog.getByRole("button", { name: "Save changes" });
		await expect(price).not.toHaveValue("");
		await status.getByRole("radio", { name: "Not for sale" }).click();
		await expect(price).toHaveValue("");
		expect(await calls(page)).toEqual([]);

		await save.click();
		await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(price).toHaveValue("");
		await expect(status.getByRole("radio", { checked: true })).toHaveText(/Not for sale/);
		await expect(save).toBeEnabled();
		expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(0);

		await outcome(page, "pending");
		await save.click();
		await expect(save).toBeDisabled();
		await expect(featured).toBeDisabled();
		await expect(status.getByRole("radio", { name: "Available", exact: true })).toBeDisabled();
		await expect(price).toBeDisabled();
		await page.evaluate(() => window.adminTest.release?.());
		await expect(dialog.locator("output")).toHaveText(/Piece updated/);
		await expect(save).toHaveCount(0);
		const saved = await calls(page);
		expect(saved).toHaveLength(2);
		expect(saved[1]).toMatchObject({
			name: "updateArtwork",
			args: [title.toLowerCase(), { status: "archive", priceInr: null }],
		});
		await page.keyboard.press("Escape");
		const reopened = await editPiece(page, title);
		await expect(reopened.getByRole("textbox", { name: "Price in INR (optional)" })).toHaveValue(
			"",
		);
		await expect(reopened.getByRole("radio", { checked: true })).toHaveText(/Not for sale/);
	});
}

test("discarding only status and Featured changes leaves the saved piece untouched", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	const dialog = await editPiece(page, "Alpha");
	await dialog.getByRole("radio", { name: "Sold", exact: true }).click();
	await dialog.getByRole("switch", { name: "Featured on home" }).click();
	await page.keyboard.press("Escape");
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(dialog.getByRole("radio", { checked: true })).toHaveText(/Sold/);
	await expect(dialog.getByRole("switch", { name: "Featured on home" })).toHaveAttribute(
		"aria-checked",
		"true",
	);
	await page.keyboard.press("Escape");
	await dialog.getByRole("button", { name: "Discard", exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	const reopened = await editPiece(page, "Alpha");
	await expect(reopened.getByRole("radio", { checked: true })).toHaveText(/Not for sale/);
	await expect(reopened.getByRole("switch", { name: "Featured on home" })).toHaveAttribute(
		"aria-checked",
		"false",
	);
	expect(await calls(page)).toEqual([]);
});

test("reverting status and Featured to their saved values clears the dirty check", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	const dialog = await editPiece(page, "Alpha");
	const featured = dialog.getByRole("switch", { name: "Featured on home" });
	await featured.click();
	await dialog.getByRole("radio", { name: "Sold", exact: true }).click();
	await expect(dialog.getByRole("button", { name: "Save changes" })).toBeVisible();
	await featured.click();
	await dialog.getByRole("radio", { name: "Not for sale" }).click();
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	expect(await calls(page)).toEqual([]);
});

test("adding a price selects Available and marking Sold preserves that price", async ({
	page,
}) => {
	await mountAdmin(page, "artworks");
	await outcome(page, "success");
	const dialog = await editPiece(page, "Alpha");
	const price = dialog.getByRole("textbox", { name: "Price in INR (optional)" });
	await price.fill("2500");
	await expect(dialog.getByRole("radio", { checked: true })).toHaveText(/Available/);
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	expect((await calls(page))[0]).toMatchObject({
		name: "updateArtwork",
		args: ["alpha", { status: "available", priceInr: 2500 }],
	});
	await dialog.getByRole("radio", { name: "Sold", exact: true }).click();
	await expect(price).toHaveValue("2500");
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog.getByRole("button", { name: "Save changes" })).toHaveCount(0);
	expect((await calls(page))[1]).toMatchObject({
		name: "updateArtwork",
		args: ["alpha", { status: "sold", priceInr: 2500 }],
	});
});

for (const closeFrom of ["Escape", "header", "backdrop"] as const) {
	test(`clean ${closeFrom} close keeps the editor mounted until its exit finishes`, async ({
		page,
	}) => {
		await page.clock.install();
		await mountAdmin(page, "artworks");
		const dialog = await editPiece(page, "Alpha");
		await page.clock.pauseAt(new Date(Date.now() + 1000));
		if (closeFrom === "Escape") await page.keyboard.press("Escape");
		else if (closeFrom === "header") {
			await dialog.getByRole("button", { name: "Close", exact: true }).click();
		} else {
			await dialog
				.getByRole("button", { name: "Close Edit piece", exact: true })
				.evaluate((button: HTMLButtonElement) => button.click());
		}
		await expect(dialog.locator(":scope > div")).toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/);
		await expect(dialog.getByRole("textbox", { name: "Title *" })).toBeDisabled();
		await page.keyboard.press("Escape");
		await page.clock.runFor(EXIT_DURATION_MS - 1);
		await expect(dialog).toHaveCount(1);
		await page.clock.runFor(1);
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^Edit Alpha, position 1/ })).toBeFocused();
		expect(await calls(page)).toEqual([]);
	});
}

test("Escape returns from confirmation; confirmed discard then runs the exit", async ({
	page,
}) => {
	await page.clock.install();
	await mountAdmin(page, "artworks");
	const dialog = await editPiece(page, "Alpha");
	await page.clock.pauseAt(new Date(Date.now() + 1000));
	await dialog.getByRole("radio", { name: "Sold", exact: true }).click();
	await page.keyboard.press("Escape");
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await expect(dialog.locator(":scope > div")).not.toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/);
	await page.keyboard.press("Escape");
	await expect(dialog.getByRole("radio", { checked: true })).toHaveText(/Sold/);
	await page.clock.runFor(EXIT_DURATION_MS);
	await expect(dialog).toHaveCount(1);

	await dialog.getByRole("button", { name: "Discard", exact: true }).click();
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await dialog.getByRole("button", { name: "Discard", exact: true }).click();
	await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeDisabled();
	await expect(dialog.locator(":scope > div")).toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/);
	await expect(dialog.locator(":scope > div")).toHaveAttribute("inert", "");
	await page.keyboard.press("Escape");
	await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
	await page.clock.runFor(EXIT_DURATION_MS - 1);
	await expect(dialog).toHaveCount(1);
	await page.clock.runFor(1);
	await expect(dialog).toHaveCount(0);
	expect(await calls(page)).toEqual([]);
});

for (const action of ["save", "delete"] as const) {
	test(`pending ${action} blocks close and confirmation navigation until it settles`, async ({
		page,
	}) => {
		await mountAdmin(page, "artworks");
		const dialog = await editPiece(page, "Alpha");
		await outcome(page, "pending");
		if (action === "save") {
			await dialog.getByRole("radio", { name: "Sold", exact: true }).click();
			await dialog.getByRole("button", { name: "Save changes" }).click();
			await expect(dialog.getByRole("button", { name: "Save changes" })).toBeDisabled();
		} else {
			await dialog.getByRole("button", { name: "Delete piece" }).click();
			await dialog.getByRole("button", { name: "Delete piece" }).click();
			await expect(dialog.getByRole("button", { name: "Keep piece" })).toBeDisabled();
		}
		await page.keyboard.press("Escape");
		await dialog.getByRole("button", { name: "Close", exact: true }).click();
		await dialog
			.getByRole("button", { name: "Close Edit piece", exact: true })
			.evaluate((button: HTMLButtonElement) => button.click());
		await expect(dialog).toBeVisible();
		await expect(dialog.locator(":scope > div")).not.toHaveClass(/(?:^|\s)opacity-0(?:\s|$)/);
		if (action === "save") {
			await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toHaveCount(0);
		} else {
			await expect(dialog.getByRole("heading", { name: 'Delete "Alpha"?' })).toBeVisible();
		}
		await outcome(page, "failure");
		await page.evaluate(() => window.adminTest.release?.());
		await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
		await page.keyboard.press("Escape");
		if (action === "save") {
			await expect(dialog.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
		} else {
			await expect(dialog.getByRole("textbox", { name: "Title *" })).toHaveValue("Alpha");
		}
		expect(await calls(page)).toHaveLength(1);
	});
}
