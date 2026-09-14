import { devices, expect, test } from "@playwright/test";

// Real-page geometry for the admin content routes against pnpm dev:preview
// (port 3010, fixture data, no sign-in). Split out of
// admin-content-mobile.spec.ts for the 500-line ceiling, the same way
// admin-catalog-layout.spec.ts split from admin-catalog.spec.ts. The admin
// Playwright config's testMatch does not yet name this file (shell-owned,
// handed over); the root config picks it up from tests/e2e. Run with:
//   $env:KALCHAR_ADMIN_PREVIEW="1"; $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3010";
//   pnpm exec playwright test tests/e2e/admin-content-layout.spec.ts
test.use({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe("admin content layout @preview @mobile", () => {
	const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";
	test.skip(process.env.KALCHAR_ADMIN_PREVIEW !== "1", "needs pnpm dev:preview");

	const box = (locator: import("@playwright/test").Locator) =>
		locator.evaluate((el) => {
			const b = el.getBoundingClientRect();
			return { x: b.x, y: b.y, width: b.width, height: b.height };
		});

	for (const scheme of ["light", "dark"] as const) {
		const applyScheme = async (page: import("@playwright/test").Page) => {
			if (scheme === "dark") {
				await page.evaluate(() => document.documentElement.classList.add("dark"));
			}
		};

		test(`event row geometry (${scheme})`, async ({ page }) => {
			await page.goto(new URL("/admin/events", baseURL).href);
			await applyScheme(page);
			const row = page.getByRole("listitem").filter({ hasText: "Studio gathering" }).first();
			const editBody = await box(row.getByRole("button", { name: /^Edit Studio gathering/ }));
			const pin = await box(row.getByRole("button", { name: /^Pin Studio gathering/ }));
			const del = await box(row.getByRole("button", { name: /^Delete Studio gathering/ }));
			expect(del.width).toBeGreaterThanOrEqual(44);
			expect(del.height).toBeGreaterThanOrEqual(44);
			expect(del.y).toBeGreaterThanOrEqual(editBody.y + editBody.height + 16);
			expect(del.x - (pin.x + pin.width)).toBeGreaterThanOrEqual(33);
			const overflow = await row.evaluate((el) => el.scrollWidth - el.clientWidth);
			expect(overflow).toBeLessThanOrEqual(0);
		});

		test(`photo tiles keep 44px targets 8px apart (${scheme})`, async ({ page }) => {
			await page.goto(new URL("/admin/events", baseURL).href);
			await applyScheme(page);
			await page.getByRole("button", { name: /^Edit Studio gathering/ }).click();
			const tiles = page.locator("li", {
				has: page.getByRole("button", { name: /^Remove photo/ }),
			});
			const count = await tiles.count();
			expect(count).toBeGreaterThan(2);
			for (let i = 0; i < Math.min(count, 3); i++) {
				const tile = tiles.nth(i);
				const controls = await tile.getByRole("button").all();
				const boxes = [];
				for (const control of controls) {
					const b = await box(control);
					if (b.width === 0) continue; // hidden grip on coarse pointers
					expect(b.width).toBeGreaterThanOrEqual(44);
					expect(b.height).toBeGreaterThanOrEqual(44);
					boxes.push(b);
				}
				for (let a = 0; a < boxes.length; a++) {
					for (let b2 = a + 1; b2 < boxes.length; b2++) {
						const first = boxes[a]!;
						const second = boxes[b2]!;
						const apartX =
							first.x + first.width + 8 <= second.x || second.x + second.width + 8 <= first.x;
						const apartY =
							first.y + first.height + 8 <= second.y || second.y + second.height + 8 <= first.y;
						expect(apartX || apartY).toBe(true);
					}
				}
				// No control sits on the plate itself.
				expect(await tile.locator("div").first().locator("button").count()).toBe(0);
			}
		});

		test(`rhythm and surfaces (${scheme})`, async ({ page }) => {
			await page.goto(new URL("/admin/events", baseURL).href);
			await applyScheme(page);
			const row = page.getByRole("listitem").first();
			const rowPadding = await row.evaluate((el) => getComputedStyle(el).paddingTop);
			expect(rowPadding).toBe("12px");
			const rowBg = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
			const mainBg = await page
				.locator("main")
				.evaluate((el) => getComputedStyle(el).backgroundColor);
			expect(rowBg).not.toBe(mainBg);
			await page.getByRole("button", { name: "Add event", exact: true }).click();
			const input = page.getByLabel("Title *", { exact: true });
			const fontSize = await input.evaluate((el) => getComputedStyle(el).fontSize);
			expect(fontSize).toBe("16px");
			const inputBox = await box(input);
			expect(inputBox.height).toBeGreaterThanOrEqual(44);
		});

		test(`tab-bar clearance under the submit (${scheme})`, async ({ page }) => {
			await page.goto(new URL("/admin/events", baseURL).href);
			await applyScheme(page);
			await page.getByRole("button", { name: "Add event", exact: true }).click();
			const submit = page.getByRole("button", { name: "Add event", exact: true });
			await submit.evaluate((el) => el.scrollIntoView({ block: "end" }));
			const submitBox = await box(submit);
			const nav = await box(page.locator('nav[aria-label="Admin"]').last());
			expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(nav.y);
		});

		test(`testimonials show titles, never slugs (${scheme})`, async ({ page }) => {
			await page.goto(new URL("/admin/testimonials", baseURL).href);
			await applyScheme(page);
			const text = await page.evaluate(() => document.body.innerText);
			expect(text).toContain("on Radha and Krishna");
			expect(text).not.toContain("radha-krishna");
			await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
			const options = page
				.getByLabel("Link to an artwork (optional)", { exact: true })
				.locator("option");
			await expect(options.nth(0)).toHaveText("None");
			await expect(options.nth(1)).toHaveText("Radha and Krishna");
		});
	}
});
