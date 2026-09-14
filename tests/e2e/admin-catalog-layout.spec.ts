import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * Pixel checks for the /admin Pieces surface that the fixture harness cannot
 * make (the role-based flows live in admin-catalog.spec.ts). Needs `pnpm dev:preview` on 3010:
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

	/** Grid view is the default (D-A13); the row checks need list view. */
	const openList = async (page: Page) => {
		await page.goto(`${PREVIEW_URL}/admin/`);
		await page.getByRole("button", { name: "List view" }).click();
		await expect(page.locator("#pieces li").first()).toBeVisible();
	};

	test.describe("phone", () => {
		// Overlay scrollbars, as on a real phone: a desktop scrollbar would steal 15px of the 360px row.
		test.use({ isMobile: true, hasTouch: true });
		for (const width of [390, 360]) {
			test(`rows at ${width}px keep Delete clear behind the divider`, async ({ page }) => {
				await page.setViewportSize({ width, height: 844 });
				await openList(page);
				const row = page.locator("#pieces li").first();
				const star = await box(row.locator('button[aria-label^="Feature "]'));
				const remove = await box(row.locator('button[aria-label^="Delete "]'));
				const segmented = await box(row.getByRole("radiogroup"));
				expect(remove.width).toBeGreaterThanOrEqual(44);
				expect(remove.height).toBeGreaterThanOrEqual(44);
				// 1.10: star, 16px, hairline, 16px, Delete.
				expect(remove.x - (star.x + star.width)).toBeGreaterThanOrEqual(33);
				// Two-line phone row: the segmented control sits below the star line.
				expect(segmented.y).toBeGreaterThanOrEqual(star.y + star.height);
				expect(segmented.height).toBeGreaterThanOrEqual(44);
				expect(await row.evaluate((li) => li.scrollWidth === li.clientWidth)).toBe(true);
			});
		}

		test("grid tiles at 390px are square with tight seams", async ({ page }) => {
			await page.setViewportSize({ width: 390, height: 844 });
			await page.goto(`${PREVIEW_URL}/admin/`);
			const tiles = page.locator("#pieces li button");
			const first = await box(tiles.first());
			expect(Math.abs(first.width - first.height)).toBeLessThanOrEqual(1);
			const second = await box(tiles.nth(1));
			// 2px seam between neighbouring tiles (--grid-gap-tight).
			expect(Math.round(second.x - (first.x + first.width))).toBe(2);
		});
	});

	test("desktop rows are one line with the segmented control inline", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await openList(page);
		const row = page.locator("#pieces li").first();
		const edit = await box(row.locator('button[aria-label^="Edit "]'));
		const remove = await box(row.locator('button[aria-label^="Delete "]'));
		const segmented = await box(row.getByRole("radiogroup"));
		const editCentre = edit.y + edit.height / 2;
		const removeCentre = remove.y + remove.height / 2;
		const segmentedCentre = segmented.y + segmented.height / 2;
		expect(Math.abs(editCentre - removeCentre)).toBeLessThanOrEqual(4);
		expect(Math.abs(editCentre - segmentedCentre)).toBeLessThanOrEqual(4);
	});

	for (const width of [390, 1280]) {
		test(`dark rows sit lighter than the ground at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 844 });
			await openList(page);
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
