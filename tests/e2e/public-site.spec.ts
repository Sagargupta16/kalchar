import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
	"/",
	"/work/",
	"/events/",
	"/about/",
	"/workshops/",
	"/custom-orders/",
	"/contact/",
	"/trust/",
] as const;

for (const theme of ["light", "dark"] as const) {
	for (const route of PUBLIC_ROUTES) {
		test(`${route} passes ${theme} accessibility and overflow checks`, async ({ page }) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.addInitScript((selectedTheme) => {
				localStorage.setItem("theme", selectedTheme);
			}, theme);
			const response = await page.goto(route, { waitUntil: "domcontentloaded" });
			expect(response?.ok()).toBe(true);
			await page.waitForLoadState("networkidle");
			await expect(page.getByRole("main")).toHaveCount(1);
			await expect(page.getByRole("main")).toBeVisible();
			await page.waitForFunction(
				() => document.querySelectorAll("[data-motion-reveal]").length === 0,
			);
			await page.evaluate(() => {
				for (const animation of document.getAnimations()) {
					try {
						animation.finish();
					} catch {
						// Infinite decorative animations cannot be finished.
					}
				}
			});

			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
			);
			expect(overflow).toBeLessThanOrEqual(1);

			const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
			expect(canonical).not.toBeNull();
			expect(new URL(canonical as string).pathname).toBe(route);

			const openGraphUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
			expect(openGraphUrl).not.toBeNull();
			expect(new URL(openGraphUrl as string).pathname).toBe(route);
			await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
				"content",
				/opengraph-image/,
			);
			await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
				"content",
				/opengraph-image/,
			);

			const accessibility = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();
			expect(accessibility.violations).toEqual([]);
		});
	}
}

test("configuration failures are not presented as allowlist rejections", async ({ page }) => {
	await page.goto("/access-denied/?error=Configuration");
	await expect(page.getByRole("heading", { name: "Sign-in unavailable" })).toBeVisible();
	await expect(page.getByText("isn't on the maintainer list")).toHaveCount(0);
});

test("hero stays complete when R2 artwork requests fail", async ({ page }) => {
	await page.route(/https:\/\/[^/]+\.r2\.dev\/artworks\//, (route) => route.abort("failed"));
	const response = await page.goto("/", { waitUntil: "domcontentloaded" });
	expect(response?.ok()).toBe(true);

	const hero = page.locator("main section").first();
	const description = hero.locator(".t-lead");
	await expect(description).toBeVisible();
	await expect(description).not.toBeEmpty();
	await expect(description.locator(".split-char")).toHaveCount(0);

	const plateImages = hero.locator(".hero-plate img");
	await expect(plateImages).toHaveCount(2);
	await expect
		.poll(() =>
			plateImages.evaluateAll((images) =>
				images.every(
					(image) =>
						image instanceof HTMLImageElement &&
						image.complete &&
						image.naturalWidth > 0 &&
						new URL(image.currentSrc).origin === globalThis.location.origin,
				),
			),
		)
		.toBe(true);

	// The delayed shuffle must not replace the working pair with blank plates.
	await expect(hero.locator("[data-shuffle-status]")).toHaveAttribute(
		"data-shuffle-status",
		/^(applied|skipped)$/,
	);
	await expect
		.poll(() =>
			plateImages.evaluateAll((images) =>
				images.every(
					(image) =>
						image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
				),
			),
		)
		.toBe(true);
});

test("hero shuffle keeps both tilted plates decoded", async ({ page }) => {
	for (let attempt = 0; attempt < 6; attempt += 1) {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		const plateImages = page.locator(".hero-plate img");
		await expect(plateImages).toHaveCount(2);

		await expect
			.poll(() =>
				plateImages.evaluateAll((images) =>
					images.every(
						(image) =>
							image instanceof HTMLImageElement &&
							image.complete &&
							image.naturalWidth > 0 &&
							new URL(image.currentSrc).origin === globalThis.location.origin,
					),
				),
			)
			.toBe(true);

		await expect(page.locator("[data-shuffle-status]")).toHaveAttribute(
			"data-shuffle-status",
			"applied",
		);
		await expect
			.poll(() =>
				plateImages.evaluateAll((images) =>
					images.every(
						(image) =>
							image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
					),
				),
			)
			.toBe(true);

		for (const plate of await page.locator(".hero-plate").all()) {
			await expect(plate).not.toHaveCSS("transform", "none");
		}
	}
});

test(
	"mobile navigation and header controls meet touch target minimums",
	{ tag: "@mobile" },
	async ({ page }) => {
		await page.goto("/");

		const menu = page.getByRole("button", { name: "Open menu" });
		await expect(menu).toBeVisible();
		const menuBox = await menu.boundingBox();
		expect(menuBox?.width).toBeGreaterThanOrEqual(44);
		expect(menuBox?.height).toBeGreaterThanOrEqual(44);

		const themeButtons = page.getByRole("group", { name: "Theme" }).getByRole("button");
		await expect(themeButtons).toHaveCount(2);
		for (const button of await themeButtons.all()) {
			const box = await button.boundingBox();
			expect(box?.width).toBeGreaterThanOrEqual(44);
			expect(box?.height).toBeGreaterThanOrEqual(44);
		}

		await menu.click();
		await expect(page.getByRole("navigation", { name: "Primary mobile" })).toBeVisible();
	},
);

test("gallery filter state is reflected in the URL", async ({ page }) => {
	await page.goto("/work/");
	const style = page.getByRole("button", { name: "Madhubani", exact: true });
	await expect(style).toBeVisible();
	await style.click();
	await expect(page).toHaveURL(/style=Madhubani/);
	await expect(style).toHaveAttribute("aria-pressed", "true");
});

test(
	"touch layouts hide the hover-only zoom hint",
	{ tag: "@mobile" },
	async ({ page }) => {
		await page.goto("/work/");
		await page.locator("main a[aria-label]").first().click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByText("Hover to zoom")).toBeHidden();
	},
);

test.describe("reduced motion", () => {
	test.use({ reducedMotion: "reduce" });

	test("flattens hero plates and keeps the description visible", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
			true,
		);
		const plate = page.locator(".hero-plate").first();
		await expect(plate).toBeVisible();
		await expect(plate).toHaveCSS("transform", "none");

		const description = page.locator("main section").first().locator(".t-lead");
		await expect(description).toBeVisible();
		await expect(description).not.toBeEmpty();
	});
});
