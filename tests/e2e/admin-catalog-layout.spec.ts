import { expect, type Locator, test } from "@playwright/test";

/**
 * Pixel checks for the /admin Pieces list that the fixture harness cannot make
 * (the role-based flows live in admin-catalog.spec.ts). Needs `pnpm dev:preview` on 3010:
 *   KALCHAR_ADMIN_PREVIEW=1 pnpm exec playwright test --config tests/admin/playwright.config.ts tests/e2e/admin-catalog-layout.spec.ts -g "@preview"
 * Never through the root config (its webServer refuses a port already serving).
 */
test.describe("layout @preview", () => {
	test.skip(process.env.KALCHAR_ADMIN_PREVIEW !== "1", "needs pnpm dev:preview");
	// localhost, not 127.0.0.1: Next dev only serves its client chunks and HMR to allowed dev origins.
	const PREVIEW_URL = process.env.KALCHAR_PREVIEW_URL ?? "http://localhost:3010";

	const box = (locator: Locator) =>
		locator.evaluate((element) => {
			const { x, y, width, height } = element.getBoundingClientRect();
			return { x, y, width, height };
		});

	test.describe("phone", () => {
		// Overlay scrollbars, as on a real phone: a desktop scrollbar would steal 15px of the 360px row.
		test.use({ isMobile: true, hasTouch: true });
		for (const width of [390, 360]) {
			test(`rows at ${width}px keep Delete clear of Edit and the star`, async ({ page }) => {
				await page.setViewportSize({ width, height: 844 });
				await page.goto(`${PREVIEW_URL}/admin/`);
				const row = page.locator("#pieces li").first();
				const edit = await box(row.locator('button[aria-label^="Edit "]'));
				const star = await box(row.locator('button[aria-label^="Feature "]'));
				const remove = await box(row.locator('button[aria-label^="Delete "]'));
				expect(remove.width).toBeGreaterThanOrEqual(44);
				expect(remove.height).toBeGreaterThanOrEqual(44);
				expect(remove.x - (star.x + star.width)).toBeGreaterThanOrEqual(33);
				expect(remove.y).toBeGreaterThanOrEqual(edit.y + edit.height + 16);
				expect(await row.evaluate((li) => li.scrollWidth === li.clientWidth)).toBe(true);
			});
		}
	});

	test("desktop rows are one line", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto(`${PREVIEW_URL}/admin/`);
		const row = page.locator("#pieces li").first();
		const edit = await box(row.locator('button[aria-label^="Edit "]'));
		const remove = await box(row.locator('button[aria-label^="Delete "]'));
		const editCentre = edit.y + edit.height / 2;
		const removeCentre = remove.y + remove.height / 2;
		expect(Math.abs(editCentre - removeCentre)).toBeLessThanOrEqual(4);
	});

	for (const width of [390, 1280]) {
		test(`dark rows sit lighter than the ground at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 844 });
			await page.goto(`${PREVIEW_URL}/admin/`);
			await page.evaluate(() => document.documentElement.classList.add("dark"));
			// adminRow carries transition-ui, so the colour swap takes --duration-base to settle.
			await page.waitForTimeout(400);
			const lightness = await page.evaluate(() => {
				// Chrome serialises the tokens in mixed spaces (lab, oklab); a canvas normalises to sRGB luminance.
				const read = (element: Element | null) => {
					const value = element ? getComputedStyle(element).backgroundColor : "";
					const context = document.createElement("canvas").getContext("2d");
					if (!context) return Number.NaN;
					context.fillStyle = value;
					context.fillRect(0, 0, 1, 1);
					const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
					return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
				};
				return {
					row: read(document.querySelector("#pieces li")),
					ground: read(document.documentElement),
				};
			});
			expect(lightness.row).toBeGreaterThan(lightness.ground);
		});
	}
});
