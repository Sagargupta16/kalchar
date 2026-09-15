import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, test } from "@playwright/test";
import { SERVER_BRAND_COLORS } from "../../lib/server-brand-colors";
import { settleAnimations } from "./helpers/animation-settle";

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));

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

async function expectTouchTarget(locator: Locator) {
	const box = await locator.boundingBox();
	// Translated layers can report 43.99997px for a 44px control.
	expect(box?.width).toBeGreaterThanOrEqual(44 - 0.01);
	expect(box?.height).toBeGreaterThanOrEqual(44 - 0.01);
}

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({
			body: MEDIA_FIXTURE,
			contentType: "image/jpeg",
		}),
	);
});

for (const theme of ["light", "dark"] as const) {
	for (const route of PUBLIC_ROUTES) {
		test(`${route} passes ${theme} accessibility and overflow checks`, async ({ page }) => {
			await page.addInitScript((selectedTheme) => {
				localStorage.setItem("theme", selectedTheme);
			}, theme);
			const response = await page.goto(route, { waitUntil: "domcontentloaded" });
			expect(response?.ok()).toBe(true);
			await expect(page.getByRole("main")).toHaveCount(1);
			await expect(page.getByRole("main")).toBeVisible();
			await settleAnimations(page);

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
	await page.unroute("**/media/**");
	await page.route("**/media/artworks/**", (route) => route.abort("failed"));
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
		await expectTouchTarget(menu);

		const themeToggle = page.getByRole("button", { name: /Switch to (dark|light) theme/ });
		await expect(themeToggle).toBeVisible();
		await expectTouchTarget(themeToggle);

		// The drawer floats over the page: #main must not move when it opens (chrome-4).
		const mainTop = await page.locator("#main").evaluate((el) => el.getBoundingClientRect().top);
		await menu.click();
		const drawer = page.getByRole("navigation", { name: "Primary mobile" });
		await expect(drawer).toBeVisible();
		expect(await page.locator("#main").evaluate((el) => el.getBoundingClientRect().top)).toBe(
			mainTop,
		);

		// Full-height index panel (visual-direction 2.12): the sheet covers the
		// small-viewport height and opening it never moves #main.
		const panel = page.locator("#mobile-menu");
		const panelBox = await panel.boundingBox();
		const viewport = page.viewportSize();
		expect(panelBox?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);

		// Steering 2026-09-14: the panel is the flagship iOS material -- a
		// translucent raised tint over a static 24px blur + saturate with the
		// hairline and e4 in one shadow list (material-glass-strong).
		const material = await panel.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { fill: cs.backgroundColor, filter: cs.backdropFilter };
		});
		expect(material.filter).toMatch(/blur\(24px\)/);
		expect(material.filter).toMatch(/saturate\(1\.5\)/);
		expect(material.fill).toMatch(/\/ 0\.9\)/);

		// Six numbered destinations, each row at least 56px tall with a tabular index.
		const rows = drawer.getByRole("link");
		await expect(rows).toHaveCount(6);
		await expect(rows.first()).toHaveText(/Artwork/);
		await expect(drawer.getByText("01", { exact: true })).toBeVisible();
		await expect(drawer.getByText("06", { exact: true })).toBeVisible();
		for (const row of await rows.all()) {
			const box = await row.boundingBox();
			expect(box?.height).toBeGreaterThanOrEqual(56 - 0.01);
		}

		// Steering 2026-09-14: row labels sit on the calmer h3 rung (18 -> 20px),
		// down from the shouty text-title register; touch targets stay 56px.
		const labelSize = await rows
			.first()
			.locator(".t-headline")
			.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
		expect(labelSize).toBeGreaterThanOrEqual(18);
		expect(labelSize).toBeLessThanOrEqual(20);

		// The WhatsApp action keeps its content but moves to a pinned full-width
		// primary at the panel bottom, at least 48px tall.
		const whatsappRow = panel.getByRole("link", { name: /Message on WhatsApp/ });
		await expect(whatsappRow).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
		const whatsappBox = await whatsappRow.boundingBox();
		expect(whatsappBox?.height).toBeGreaterThanOrEqual(48 - 0.01);
		if (!panelBox || !whatsappBox) throw new Error("drawer boxes missing");
		expect(whatsappBox.y).toBeGreaterThan(panelBox.y + panelBox.height / 2);
		await page.keyboard.press("Escape");
		await expect(drawer).toBeHidden();

		await page.goto("/work/");
		await expect(page.getByRole("searchbox", { name: "Find a piece you love" })).toBeVisible();
		const filters = page.getByRole("group", { name: "Filter artwork" }).getByRole("button");
		for (const filter of await filters.all()) {
			await expectTouchTarget(filter);
		}

		const footer = page.getByRole("contentinfo");
		await expectTouchTarget(footer.getByRole("link", { name: "Home" }));
		await expectTouchTarget(footer.getByRole("link", { name: "FAQ" }));

		await page.goto("/trust/");
		for (const summary of await page.locator("summary").all()) {
			await expectTouchTarget(summary);
		}
	},
);

test(
	"tablet header keeps compact controls visible",
	{ tag: "@mobile" },
	async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto("/");

		await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
		await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
		const themeToggle = page.getByRole("button", { name: /Switch to (dark|light) theme/ });
		await expect(themeToggle).toBeVisible();
		await expectTouchTarget(themeToggle);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(1);
	},
);

test("header keeps one 61px control row before and after scrolling", { tag: "@mobile" }, async ({ page }) => {
	await page.goto("/");
	const header = page.locator("header").first();
	// One padding in both states (motion addendum C5): the bar never animates layout.
	await expect
		.poll(() => header.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
		.toBe(61);
	await page.mouse.wheel(0, 300);
	await expect
		.poll(() => header.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
		.toBe(61);
});

test("the header glass appears after scroll and stays statically blurred", async ({ page }) => {
	await page.goto("/");
	const header = page.locator("header").first();
	const readSurface = () =>
		header.evaluate((el) => {
			const cs = getComputedStyle(el);
			return { fill: cs.backgroundColor, filter: cs.backdropFilter };
		});
	// The blur + saturate pair is static and present in both states (it keeps
	// the header a containing block for the drawer; never animated).
	const atTop = await readSurface();
	expect(atTop.filter).toMatch(/blur\(16px\)/);
	expect(atTop.filter).toMatch(/saturate\(1\.5\)/);
	// At rest the bar is solid; scrolling thins the fill so content sliding
	// under the bar is what reveals the material (steering 2026-09-14).
	expect(atTop.fill).not.toMatch(/\/ 0?\.\d/);
	await page.mouse.wheel(0, 400);
	await expect.poll(async () => (await readSurface()).fill).toMatch(/\/ 0\.85\)/);
});

test("theme toggle drives the browser theme colour", async ({ page }) => {
	await page.goto("/");
	const meta = page.locator('meta[name="theme-color"]');
	await expect(meta).toHaveCount(1);
	await expect(meta).toHaveAttribute("content", SERVER_BRAND_COLORS.paper);
	await page.getByRole("button", { name: "Switch to dark theme" }).click();
	await expect(page.locator("html")).toHaveClass(/dark/);
	await expect(meta).toHaveAttribute("content", SERVER_BRAND_COLORS.night);
	expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
});

test("back to top yields to the footer bottom bar", async ({ page }) => {
	await page.goto("/");
	const fab = page.locator("[data-back-to-top]");
	const footer = page.getByRole("contentinfo");
	await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
	await expect(fab).toHaveCSS("opacity", "0");
	await expect(footer.getByRole("link", { name: "FAQ" })).toBeInViewport();
	await expect(footer.getByRole("navigation", { name: "Footer" }).getByRole("link")).toHaveCount(6);
	await expect(footer.locator("[data-channel-row] a")).toHaveCount(5);
	await expect(footer.getByRole("link")).toHaveCount(15);
	for (const link of await footer.getByRole("link").all()) {
		await expectTouchTarget(link);
	}
	const footerHeight = await footer.evaluate((el) => el.getBoundingClientRect().height);
	if ((page.viewportSize()?.width ?? 0) >= 1024) {
		expect(footerHeight).toBeLessThanOrEqual(340);
	} else {
		expect(footerHeight).toBeLessThanOrEqual(640);
	}
	await page.mouse.wheel(0, -400);
	await expect(fab).toHaveCSS("opacity", "1");
});

test("floating WhatsApp disc follows the route policy", async ({ page }) => {
	await page.goto("/");
	const fab = page.locator("[data-enquire-fab]");
	await expect(fab).toHaveCount(1);
	await expect(fab).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
	await expect(fab).toHaveCSS("opacity", "0");
	// Past one viewport the disc fades in (visual-direction 2.14).
	await page.evaluate(() => globalThis.scrollTo(0, globalThis.innerHeight * 2));
	await expect(fab).toHaveCSS("opacity", "1");
	// While shown the disc face breathes on the idle float loop (steering
	// 2026-09-14): 3px half-cycle, running only while visible.
	const face = fab.locator("span").first();
	await expect(face).toHaveCSS("animation-name", "plate-float");
	await expect(face).toHaveCSS("animation-play-state", "running");
	// While the footer channel row is on screen it yields.
	await page.evaluate(() => globalThis.scrollTo(0, document.documentElement.scrollHeight));
	await expect(fab).toHaveCSS("opacity", "0");
	// The contact page and the commission form own their action: never mounted.
	await page.goto("/contact/");
	await expect(page.locator("[data-enquire-fab]")).toHaveCount(0);
	await page.goto("/custom-orders/");
	await expect(page.locator("[data-enquire-fab]")).toHaveCount(0);
	// Detail pages hand the action to the enquiry bar (2.14): never mounted.
	await page.goto("/work/");
	const detailPath = await page
		.locator('main a[aria-label][href^="/work/"]')
		.first()
		.getAttribute("href");
	expect(detailPath).not.toBeNull();
	await page.goto(detailPath as string);
	await expect(page.locator("[data-enquire-fab]")).toHaveCount(0);
});

test("gallery filter state is reflected in the URL", async ({ page }) => {
	await page.goto("/work/");
	const style = page.getByRole("button", { name: /^Madhubani / });
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

test.describe("always-on motion", () => {
	test("shuffles hero plates and keeps the description visible under either OS preference", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
			true,
		);
		// Media is fulfilled by the fixture, so a skipped shuffle would be a policy regression.
		const stage = page.locator("[data-shuffle-status]");
		await expect(stage).toHaveAttribute("data-shuffle-status", "applied");
		const plates = page.locator(".hero-plate");
		await expect(plates).toHaveCount(2);
		for (const plate of await plates.all()) {
			await expect(plate).toBeVisible();
			await expect(plate).not.toHaveCSS("transform", "none");
		}

		const description = page.locator("main section").first().locator(".t-lead");
		await expect(description).toBeVisible();
		await expect(description).not.toBeEmpty();
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await expect(stage).toHaveAttribute("data-shuffle-status", "applied");
		await expect(description).toBeVisible();
	});

	test("keeps the WhatsApp idle breath but pauses it while hidden", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		// OS preference does not disable the animation; visibility still pauses it.
		const face = page.locator("[data-enquire-fab] span").first();
		await expect(face).toHaveCSS("animation-name", "plate-float");
		await expect(face).toHaveCSS("animation-play-state", "paused");
		await page.evaluate(() => scrollTo(0, innerHeight * 2));
		await expect(face).toHaveCSS("animation-play-state", "running");
	});
});
