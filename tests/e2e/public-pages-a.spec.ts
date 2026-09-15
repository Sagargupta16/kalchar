import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./helpers/animation-settle";

/**
 * Visual-pass contracts for the Tier 2 pages this lane owns (visual-direction
 * 2.5 about, 2.6 events, 2.7 workshops). The page-behaviour suite lives in
 * public-pages.spec.ts; this file locks the editorial-museum treatments the
 * pass added: restrained wash headers, the about monograph spread
 * and spacious pull quote, the events chronology (wall dates, gold
 * timeline, record borders, the mirrored lightbox paging), and the workshops
 * roman ledger.
 */

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const PAGES = ["/about/", "/events/", "/workshops/"] as const;

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({ body: MEDIA_FIXTURE, contentType: "image/jpeg" }),
	);
});

async function useTheme(page: Page, theme: "light" | "dark") {
	await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
}

/** Resolve a CSS custom property to its computed colour via a scratch element. */
async function resolveColor(page: Page, cssVar: string): Promise<string> {
	return page.evaluate((name) => {
		const scratch = document.createElement("span");
		scratch.style.color = getComputedStyle(document.documentElement).getPropertyValue(name);
		document.body.append(scratch);
		const color = getComputedStyle(scratch).color;
		scratch.remove();
		return color;
	}, cssVar);
}

for (const route of PAGES) {
	test(`${route} header keeps the wash and consistent text spacing without decorative rules`, async ({
		page,
	}) => {
		await page.goto(route);
		const header = page.locator("main section").first();
		const bodyBg = await page
			.locator("body")
			.evaluate((el) => getComputedStyle(el).backgroundColor);
		// The wash mixes the section pigment into the paper: visibly not the page bg.
		const headerBg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(headerBg).not.toBe(bodyBg);
		const heading = header.locator("header");
		await expect(heading.locator('[role="presentation"]')).toHaveCount(0);
		await expect(heading.locator(".rule-draw")).toHaveCount(0);
		await expect(heading.locator("h1")).toHaveCSS("margin-top", "12px");
		const lead = heading.locator(".t-lead");
		if (await lead.count()) await expect(lead).toHaveCSS("margin-top", "16px");
	});
}

for (const theme of ["light", "dark"] as const) {
	for (const route of PAGES) {
		test(`${route} passes ${theme} accessibility checks`, async ({ page }) => {
			await useTheme(page, theme);
			const response = await page.goto(route);
			expect(response?.ok()).toBe(true);
			await settleAnimations(page);
			const accessibility = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
			expect(accessibility.violations).toEqual([]);
		});
	}
}

test("about counts line reads live seam values in the numeral voice", async ({ page }) => {
	await page.goto("/about/");
	const counts = page
		.locator("main p")
		.filter({ hasText: /pieces/ })
		.first();
	await expect(counts).toBeVisible();
	const numerals = counts.locator(".t-numeral");
	await expect(numerals).toHaveCount(3);
	await expect(counts).toContainText(/tradition/);
	await expect(counts).toContainText(/workshop/);
	const first = numerals.first();
	await expect(first).toHaveCSS("font-style", "italic");
	expect(Number((await first.textContent())?.trim())).toBeGreaterThan(0);
});

test("about pull quote uses spacing and quotation typography without framing lines", async ({
	page,
}) => {
	await page.goto("/about/");
	const quote = page.locator("main blockquote");
	await expect(quote).toBeVisible();
	await quote.scrollIntoViewIfNeeded();
	await expect(quote.locator(".rule-draw")).toHaveCount(0);
	await expect(quote).toHaveCSS("border-top-width", "0px");
	await expect(quote).toHaveCSS("border-bottom-width", "0px");
	await expect(quote).toHaveCSS("border-left-width", "0px");
	await expect(quote).toHaveCSS("padding-top", "32px");
	await expect(quote).toHaveCSS("padding-bottom", "32px");
	await expect(quote).toHaveCSS("text-align", "center");
	await expect(quote.locator('span[aria-hidden="true"]')).toHaveText("“");
	await expect(quote.locator("p")).not.toBeEmpty();
	await expect(quote.locator("p")).toHaveCSS("font-style", "italic");
});

test("about portrait rests its gold inset and owns the route's priority image", async ({
	page,
}) => {
	await page.goto("/about/");
	const plate = page.locator('main [class*="aspect-3/4"]').first();
	await expect(plate).toBeVisible();
	// PlateFrame goldRest: the concentric inset line rests at full opacity.
	const inset = plate.locator("span[aria-hidden]").last();
	await expect(inset).toHaveCSS("opacity", "1");
	await expect(inset).toHaveCSS("border-top-width", "1px");
	// Exactly one LCP-priority image inside main (performance guard 3).
	await expect(page.locator('main img[fetchpriority="high"]')).toHaveCount(1);
});

test("the about portrait idles on the float breath and continues across OS preference changes", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/about/");
	// One floating plate per page (steering 2026-09-14): the portrait only.
	const float = page.locator("main .plate-float");
	await expect(float).toHaveCount(1);
	expect(await float.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
	// The label under the plate stays still: the wrapper holds the frame only.
	await expect(float.locator('[class*="aspect-3/4"]')).toHaveCount(1);
	// Changing the OS preference leaves the site animation policy unchanged.
	await page.emulateMedia({ reducedMotion: "reduce" });
	expect(await float.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
});

test("about essay column holds the 62ch measure", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "the spread composes from md");
	await page.goto("/about/");
	const essay = page.locator("main .drop-cap").locator("..").locator("..");
	const metrics = await essay.evaluate((el) => ({
		width: el.getBoundingClientRect().width,
		maxWidth: Number.parseFloat(getComputedStyle(el).maxWidth),
	}));
	expect(Number.isFinite(metrics.maxWidth)).toBe(true);
	expect(metrics.width).toBeLessThanOrEqual(metrics.maxWidth + 1);
});

test("event entries are records: top rules only, no card chrome", async ({ page }) => {
	await page.goto("/events/");
	const articles = page.locator("main article");
	await expect(articles).toHaveCount(2);
	for (const article of await articles.all()) {
		await expect(article).toHaveCSS("box-shadow", "none");
		await expect(article).toHaveCSS("border-top-width", "0px");
	}
	// The seam between records is the gold hairline on the second wrapper only.
	const gold = await resolveColor(page, "--color-gold-hairline");
	await expect(page.locator("#fixture-event")).toHaveCSS("border-top-width", "0px");
	const second = page.locator("#fixture-event-past");
	await expect(second).toHaveCSS("border-top-width", "1px");
	await expect(second).toHaveCSS("border-top-color", gold);
});

test("wall dates set the day in the numeral voice", async ({ page }, testInfo) => {
	await page.goto("/events/");
	const day = page.locator("#fixture-event time span").first();
	await expect(day).toHaveText("1");
	await expect(day).toHaveCSS("font-style", "italic");
	const size = await day.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
	if (testInfo.project.name === "mobile-chromium") {
		expect(size).toBeGreaterThanOrEqual(28);
		expect(size).toBeLessThan(40);
	} else {
		// The 1280 chronology column climbs the day to the h1 rung (48px).
		expect(size).toBeGreaterThanOrEqual(40);
	}
	// The month/year meta rides beside it, month abbreviated.
	await expect(page.locator("#fixture-event time")).toContainText(/Aug/i);
	await expect(page.locator("#fixture-event time")).toContainText("2026");
});

test("the gold timeline spans the chronology and one year watermark renders", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "the timeline composes from lg");
	await page.goto("/events/");
	const timeline = page.locator("main [data-timeline]");
	await expect(timeline).toBeVisible();
	const gold = await resolveColor(page, "--color-gold-hairline");
	await expect(timeline).toHaveCSS("background-color", gold);
	const line = await timeline.boundingBox();
	const block = await timeline.locator("..").boundingBox();
	expect(Math.round(line?.width ?? 0)).toBe(1);
	expect(Math.abs((line?.height ?? 0) - (block?.height ?? 0))).toBeLessThanOrEqual(1);
	// Both fixture events fall in 2026: exactly one watermark, on the first.
	const watermark = page.locator("main [data-year-watermark]");
	await expect(watermark).toHaveCount(1);
	await expect(watermark).toHaveText("2026");
});

test("only the lead event plate floats, never the grid", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/events/");
	// One floating plate per page (steering 2026-09-14): the lead gallery's
	// lead tile; the other five inline tiles and the second gallery stay still.
	const floats = page.locator("main .plate-float");
	await expect(floats).toHaveCount(1);
	const lead = page.getByRole("button", { name: /^View photo 1 from Studio gathering/ });
	await expect(lead.locator(".plate-float")).toHaveCount(1);
	expect(await floats.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
	await page.emulateMedia({ reducedMotion: "reduce" });
	expect(await floats.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
});

test("the lg wall date sits on the glass material chip", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "the chip composes from lg");
	await page.goto("/events/");
	const chip = page.locator("#fixture-event time");
	const material = await chip.evaluate((el) => {
		const computed = getComputedStyle(el);
		return { backdrop: computed.backdropFilter, shadow: computed.boxShadow };
	});
	// material-glass: static blur + saturate over the token tint, with the
	// hairline + e2 elevation in one box-shadow list (solid fallback where
	// backdrop-filter is unsupported; Chromium supports it).
	expect(material.backdrop).toContain("blur(16px)");
	expect(material.backdrop).toContain("saturate(1.5)");
	expect(material.shadow).not.toBe("none");
});

test("event lightbox mirrors the v2 room: paging, loop, scrim caption, no commerce", async ({
	page,
}) => {
	await page.goto("/events/");
	// The overflow tile opens at its own position (6 of 7).
	await page.getByRole("button", { name: /^View all 7 photos from / }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText("06 / 7")).toBeVisible();
	await page.keyboard.press("ArrowRight");
	await expect(dialog.getByText("07 / 7")).toBeVisible();
	// Seven photos loop (3+), so Next from the last wraps to the first.
	await page.keyboard.press("ArrowRight");
	await expect(dialog.getByText("01 / 7")).toBeVisible();
	await page.keyboard.press("Home");
	await expect(dialog.getByText("01 / 7")).toBeVisible();
	await page.keyboard.press("End");
	await expect(dialog.getByText("07 / 7")).toBeVisible();
	// Caption is scrim wall text with the bindu mark; no sidebar, no buy bar.
	await expect(dialog.locator("figcaption svg")).toHaveCount(1);
	await expect(dialog.locator("figcaption")).toContainText("Studio gathering");
	await expect(dialog.locator("a")).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
});

test("a two-photo event pages without looping", async ({ page }) => {
	await page.goto("/events/");
	await page.getByRole("button", { name: /^View photo 1 from Community mural day/ }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByText("01 / 2")).toBeVisible();
	// Clamped at the first photo: Previous does not wrap to the last.
	await page.keyboard.press("ArrowLeft");
	await expect(dialog.getByText("01 / 2")).toBeVisible();
	await page.keyboard.press("ArrowRight");
	await expect(dialog.getByText("02 / 2")).toBeVisible();
	// Clamped at the last photo: Next does not wrap back around.
	await page.keyboard.press("ArrowRight");
	await expect(dialog.getByText("02 / 2")).toBeVisible();
});

test("event photo tiles sit in plate frames and one lead image is prioritised", async ({
	page,
}) => {
	await page.goto("/events/");
	const tile = page.getByRole("button", { name: /^View photo 1 from Studio gathering/ });
	// PlateFrame: hairline plate with the concentric gold inset (hidden at rest).
	const inset = tile.locator("span[aria-hidden]").last();
	await expect(inset).toHaveCSS("border-top-width", "1px");
	await expect(inset).toHaveCSS("opacity", "0");
	// Only the first gallery's first tile carries the route's priority fetch.
	await expect(page.locator('main img[fetchpriority="high"]')).toHaveCount(1);
});

test("workshops render as the roman ledger on hairline rows", async ({ page }) => {
	await page.goto("/workshops/");
	const rows = page.locator("main ul > li");
	expect(await rows.count()).toBeGreaterThanOrEqual(3);
	// Roman numerals in the numeral voice and the pichwai pigment, 24px+.
	const numerals = ["I", "II", "III"];
	const accent = await resolveColor(page, "--color-pichwai");
	for (const [i, glyph] of numerals.entries()) {
		const numeral = rows.nth(i).locator("span[aria-hidden]").first();
		await expect(numeral).toHaveText(glyph);
		await expect(numeral).toHaveCSS("font-style", "italic");
		await expect(numeral).toHaveCSS("color", accent);
		const size = await numeral.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
		expect(size).toBeGreaterThanOrEqual(24);
	}
	// No card chrome on rows; the list opens on the gold rule, rows on the line.
	const first = rows.first();
	await expect(first).toHaveCSS("border-radius", "0px");
	await expect(first).toHaveCSS("box-shadow", "none");
	const gold = await resolveColor(page, "--color-gold-hairline");
	await expect(page.locator("main ul").first()).toHaveCSS("border-top-color", gold);
	const line = await resolveColor(page, "--color-line");
	await expect(rows.nth(1)).toHaveCSS("border-top-color", line);
});

test("@mobile workshop enquire buttons fill the row", async ({ page }) => {
	await page.goto("/workshops/");
	const row = page.locator("main ul > li").first();
	const enquire = row.getByRole("link", { name: "Enquire" });
	await enquire.scrollIntoViewIfNeeded();
	const link = await enquire.boundingBox();
	const cell = await enquire.locator("..").boundingBox();
	expect(link?.height).toBeGreaterThanOrEqual(44);
	expect(Math.abs((link?.width ?? 0) - (cell?.width ?? 0))).toBeLessThanOrEqual(1);
});

test("workshop enquiry links carry the hover feedback without making the row look clickable", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "hover-capable pointers only");
	await page.goto("/workshops/");
	const row = page.locator("main ul > li").first();
	await row.scrollIntoViewIfNeeded();
	const restingBackground = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
	await row.hover();
	await expect(row).toHaveCSS("background-color", restingBackground);
	const enquiry = row.getByRole("link", { name: /^Enquire on WhatsApp about / });
	await enquiry.hover();
	await expect(enquiry).toHaveCSS("border-top-color", await resolveColor(page, "--color-accent"));
	await expect(enquiry).toHaveAttribute("href", /^https:\/\/wa\.me\/.+\?text=/);
});
