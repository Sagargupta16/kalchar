import { expect, type Page, test } from "@playwright/test";

// Uses the same fixture build and browser matrix as the public regression suite.

const pieces = [
	{
		slug: "radha-krishna",
		status: "available",
		label: "Enquire on WhatsApp",
		message: "I'd like to buy",
	},
	{
		slug: "ganesha-pichwai",
		status: "sold",
		label: "Ask about a similar piece",
		message: "I'd like to commission a similar piece",
	},
	{
		slug: "shrinathji",
		status: "archive",
		label: "Ask about this piece",
		message: "Could we discuss a similar piece or a commission?",
	},
] as const;

async function openPiece(page: Page, slug: string) {
	const response = await page.goto(`/work/${slug}/`);
	expect(response?.ok()).toBe(true);
	await page.evaluate(() => document.fonts.ready);
	await expect(page.locator('main img[fetchpriority="high"]')).toHaveJSProperty("complete", true);
}

const bar = (page: Page) => page.locator("main > div.fixed");
const reservedHeight = (page: Page) =>
	page.evaluate(() => document.documentElement.style.getPropertyValue("--fixed-bar-h"));

for (const width of [320, 768]) {
	for (const piece of pieces) {
		test(`${piece.status} detail fits at ${width}px and keeps the correct enquiry intent`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 740 });
			await openPiece(page, piece.slug);
			const image = page.locator('main img[fetchpriority="high"]');
			await expect(image).toHaveCSS("object-fit", "contain");
			expect(await image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
			const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
			for (const target of [image, page.getByRole("button", { name: "View full screen" })]) {
				const box = await target.boundingBox();
				expect(box!.x).toBeGreaterThanOrEqual(-1);
				expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
			}
			await expect(
				image.locator("xpath=ancestor::div[contains(@class,'overflow-hidden')][1]"),
			).toHaveCSS("border-top-left-radius", "16px");

			const panel = page.locator("#enquire");
			await panel.scrollIntoViewIfNeeded();
			const cta = panel.getByRole("link", { name: piece.label, exact: true });
			const message = new URL((await cta.getAttribute("href"))!).searchParams.get("text");
			expect(message).toContain(piece.message);
			if (piece.status === "available") expect(message).toContain("Listed price:");
			else expect(message).not.toContain("Listed price:");
			await expect(panel.getByRole("link", { name: "Browse available artwork" })).toHaveCount(
				piece.status === "sold" ? 1 : 0,
			);
			const panelBox = (await panel.boundingBox())!;
			const ctaBox = (await cta.boundingBox())!;
			expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportWidth + 1);
			expect(ctaBox.x).toBeGreaterThanOrEqual(panelBox.x);
			expect(ctaBox.x + ctaBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
			expect(ctaBox.height).toBeGreaterThanOrEqual(44);
			await expect(cta).toHaveCSS("white-space", "normal");
		});
	}
}

test("enquiry bar reserves its current height across desktop/mobile resizing", async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 400 });
	await openPiece(page, "ganesha-pichwai");
	await expect(bar(page)).toHaveAttribute("aria-hidden", "false");
	await expect.poll(() => reservedHeight(page)).toBe("");

	await page.setViewportSize({ width: 390, height: 400 });
	await expect(bar(page)).toBeVisible();
	await expect
		.poll(async () => {
			const height = await bar(page).evaluate((el: HTMLElement) => el.offsetHeight);
			return (await reservedHeight(page)) === `${height}px` && height > 0;
		})
		.toBe(true);
	await page.setViewportSize({ width: 320, height: 400 });
	await expect
		.poll(async () => {
			const height = await bar(page).evaluate((el: HTMLElement) => el.offsetHeight);
			return (await reservedHeight(page)) === `${height}px`;
		})
		.toBe(true);
	await page.setViewportSize({ width: 1100, height: 400 });
	await expect.poll(() => reservedHeight(page)).toBe("");
});

test("mobile sticky enquiry yields to the panel and the page end", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 740 });
	await openPiece(page, "radha-krishna");
	await expect(bar(page)).toHaveAttribute("aria-hidden", "false");
	const panel = page.locator("#enquire");
	expect(await bar(page).locator("a").getAttribute("href")).toBe(
		await panel.locator('a[href^="https://wa.me/"]').getAttribute("href"),
	);
	await panel.scrollIntoViewIfNeeded();
	await expect(bar(page)).toHaveAttribute("aria-hidden", "true");
	await expect(bar(page)).toHaveJSProperty("inert", true);
	await expect.poll(() => reservedHeight(page)).toBe("");
	await page.evaluate(() =>
		window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
	);
	await expect(bar(page)).toHaveAttribute("aria-hidden", "true");
});

test("mobile full-image control opens by keyboard and regains focus on close", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 740 });
	await openPiece(page, "ganesha-pichwai");
	const expand = page.getByRole("button", { name: "View full screen" });
	await expand.focus();
	await page.keyboard.press("Enter");
	const viewer = page.getByRole("dialog");
	await expect(viewer).toBeVisible();
	await expect(viewer.locator("img").first()).toHaveCSS("object-fit", "contain");
	await page.keyboard.press("Escape");
	await expect(viewer).toHaveCount(0);
	await expect(expand).toBeFocused();
});
