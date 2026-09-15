import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { settleAnimations } from "./helpers/animation-settle";

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({ body: MEDIA_FIXTURE, contentType: "image/jpeg" }),
	);
});

function galleryCards(page: Page) {
	return page.locator('main a[aria-label][href^="/work/"]');
}

async function definition(page: Page, label: string) {
	return page
		.locator("main dl dt")
		.filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) })
		.locator("xpath=following-sibling::dd[1]")
		.innerText();
}

async function expectModalFocus(page: Page, trigger: Locator, lastControl: Locator) {
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
	await settleAnimations(page, "dialog");
	const accessibility = await new AxeBuilder({ page })
		.include("dialog")
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
	await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
	await page.keyboard.press("Shift+Tab");
	await expect(lastControl).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();

	// Modal background isolation also prevents programmatic focus escaping.
	await trigger.evaluate((element) => (element as HTMLElement).focus());
	expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
}

test("artwork viewer contains forward/reverse focus and restores its trigger", async ({ page }) => {
	await page.goto("/work/");
	const trigger = galleryCards(page).first();
	await trigger.click();
	// The buy bar puts the enquiry link and price on the first screen of the modal.
	const enquiry = page.getByRole("dialog").getByRole("link", { name: "Enquire on WhatsApp" });
	await expect(enquiry).toBeInViewport();
	const price = page.getByRole("dialog").getByText(/INR [\d,]+/);
	await expect(price).toHaveCount(1);
	await expect(price).toBeInViewport();
	await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).focus();
	await page.screenshot({
		path: test.info().outputPath("artwork-viewer.png"),
		animations: "disabled",
	});
	await expectModalFocus(
		page,
		trigger,
		page.getByRole("dialog").getByRole("button", { name: /^Share / }),
	);
});

test("gallery viewer retains detail metadata and shares the canonical artwork URL", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: async (data: ShareData) => {
				const output = document.createElement("output");
				output.id = "shared-artwork";
				output.textContent = JSON.stringify(data);
				document.body.append(output);
			},
		});
	});
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	expect(path).not.toBeNull();
	await page.goto(path as string);
	const year = await definition(page, "Year");
	const dimensions = await definition(page, "Dimensions");
	const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");

	await page.goto("/work/");
	await galleryCards(page).first().click();
	const dialog = page.getByRole("dialog");
	await expect(dialog.locator("dd").filter({ hasText: year })).toBeVisible();
	await expect(dialog.locator("dd").filter({ hasText: dimensions })).toBeVisible();
	// One label vocabulary: the lightbox says Dimensions like the detail page, never Size.
	await expect(dialog.locator("dt", { hasText: "Dimensions" })).toHaveCount(1);
	await expect(dialog.locator("dt", { hasText: /^\s*Size\s*$/ })).toHaveCount(0);
	await dialog.getByRole("button", { name: /^Share / }).click();
	const shared = JSON.parse((await page.locator("#shared-artwork").textContent()) ?? "{}");
	expect(shared.url).toBe(canonical);
});

test("sold artwork uses the same commission intent on its page and in the viewer", async ({
	page,
}) => {
	await page.goto("/work/");
	const soldCard = page.locator('main a[aria-label$=", sold"]').first();
	const path = await soldCard.getAttribute("href");
	expect(path).not.toBeNull();
	await soldCard.click();
	const viewerLink = page.getByRole("dialog").getByRole("link", {
		name: "Ask about a similar piece",
	});
	const viewerHref = await viewerLink.getAttribute("href");
	expect(new URL(viewerHref as string).searchParams.get("text")).toContain(
		"commission a similar piece",
	);
	await page.keyboard.press("Escape");
	await page.goto(path as string);
	// Scoped to the CTA panel: the phone enquiry bar renders a second link with the same label.
	const pageLink = page.locator("#enquire").getByRole("link", {
		name: "Ask about a similar piece",
	});
	await expect(pageLink).toHaveAttribute("href", viewerHref as string);
	expect(new URL(viewerHref as string).searchParams.get("text")).not.toContain("Listed price");
});

test("viewer thumbnails keep selection, keyboard focus and history together", async ({ page }) => {
	await page.goto("/work/");
	await settleAnimations(page);
	const cards = galleryCards(page);
	const targetPath = await cards.nth(1).getAttribute("href");
	const trigger = cards.first();
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const rail = dialog.getByRole("navigation", { name: "Artwork thumbnails" });
	const thumbnails = rail.getByRole("button");
	expect(await thumbnails.count()).toBeGreaterThan(2);
	await expect(rail.locator('[aria-current="true"]')).toHaveCount(1);
	await expect(thumbnails.first()).toHaveAttribute("aria-current", "true");
	const target = thumbnails.nth(1);
	const title = (await target.getAttribute("aria-label"))?.replace(/^View /, "");
	const size = await target.boundingBox();
	expect(size?.width).toBeGreaterThanOrEqual(44);
	expect(size?.height).toBeGreaterThanOrEqual(44);
	await expect(target.locator("img")).toHaveCSS("object-fit", "contain");
	await target.click();
	await expect(target).toHaveAttribute("aria-current", "true");
	await expect(dialog.locator("#lightbox-title")).toHaveText(title ?? "");
	const targetSlug = targetPath?.split("/").filter(Boolean).at(-1);
	await expect.poll(() => new URL(page.url()).searchParams.get("piece")).toBe(targetSlug);
	await target.press("ArrowRight");
	await expect(thumbnails.nth(2)).toHaveAttribute("aria-current", "true");
	await expect(thumbnails.nth(2)).toBeFocused();
	await thumbnails.nth(2).press("End");
	await expect(thumbnails.last()).toHaveAttribute("aria-current", "true");
	await expect(thumbnails.last()).toBeFocused();
	await thumbnails.last().press("ArrowRight");
	await expect(thumbnails.first()).toHaveAttribute("aria-current", "true");
	await expect(thumbnails.first()).toBeFocused();
	await thumbnails.first().press("ArrowLeft");
	await expect(thumbnails.last()).toHaveAttribute("aria-current", "true");
	await expect(thumbnails.last()).toBeFocused();
	await thumbnails.last().press("Home");
	await expect(thumbnails.first()).toHaveAttribute("aria-current", "true");
	await expect(thumbnails.first()).toBeFocused();
	// Browsing thumbnails replaces the current piece; one Back still closes the viewer.
	await page.goBack();
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test.describe("responsive artwork delivery", () => {
	test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

	test("uniform cards use compact variants and neighbours preload the viewer source", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto("/work/");
		const cards = galleryCards(page);
		const firstImage = cards.first().locator("img");
		await expect
			.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.currentSrc))
			.toMatch(/-400\.avif$/);
		const neighbourImage = cards.nth(1).locator("img");
		await expect
			.poll(() => neighbourImage.evaluate((image: HTMLImageElement) => image.currentSrc))
			.toMatch(/-400\.avif$/);
		const neighbourPath = new URL(
			await neighbourImage.evaluate((image: HTMLImageElement) => image.currentSrc),
		).pathname.replace(/-\d+\.avif$/, "");
		const preload = page.waitForRequest((request) =>
			new URL(request.url()).pathname.endsWith(`${neighbourPath}-800.avif`),
		);
		await cards.first().click();
		const preloadedUrl = (await preload).url();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Next artwork" }).click();
		await expect(dialog.locator("figure img")).toHaveCount(1);
		await expect
			.poll(() =>
				dialog.locator("figure img").evaluate((image: HTMLImageElement) => image.currentSrc),
			)
			.toBe(preloadedUrl);
	});
});

test("smooth scrolling retains its pointer gate across OS preference changes", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/about/");
	const finePointer = await page.evaluate(
		() => matchMedia("(hover: hover) and (pointer: fine)").matches,
	);
	const root = page.locator("html");
	if (finePointer) await expect(root).toHaveClass(/\blenis\b/);
	else await expect(root).not.toHaveClass(/\blenis\b/);

	await page.emulateMedia({ reducedMotion: "reduce" });
	if (finePointer) await expect(root).toHaveClass(/\blenis\b/);
	else await expect(root).not.toHaveClass(/\blenis\b/);
	await page.emulateMedia({ reducedMotion: "no-preference" });
	if (finePointer) await expect(root).toHaveClass(/\blenis\b/);
	else await expect(root).not.toHaveClass(/\blenis\b/);
});

/** Rendered box ratio (width / height) plus the data ratio the element was sized from. */
async function plateRatios(plate: Locator) {
	return plate.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const dataRatio = Number.parseFloat(
			getComputedStyle(element).getPropertyValue("--plate-ratio"),
		);
		return { box: box.width / box.height, data: dataRatio, height: box.height };
	});
}

test("detail plate and lightbox figure show the whole painting", async ({ page }, testInfo) => {
	const mobile = testInfo.project.name === "mobile-chromium";
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	expect(path).not.toBeNull();
	await page.goto(path as string);
	const plateImage = page.locator("main img[fetchpriority=high]");
	await expect(plateImage).toHaveCSS("object-fit", "contain");
	const plate = plateImage.locator("xpath=ancestor::*[contains(@style, '--plate-ratio')][1]");
	const detail = await plateRatios(plate);
	expect(Math.abs(detail.box - detail.data)).toBeLessThan(0.02);

	await page.goto("/work/");
	await galleryCards(page).first().click();
	const figure = page.getByRole("dialog").locator("figure");
	await expect(figure.locator("img")).toHaveCSS("object-fit", "contain");
	const viewer = await plateRatios(figure);
	expect(Math.abs(viewer.box - viewer.data)).toBeLessThan(0.02);
	const viewport = page.viewportSize();
	// 60dvh cap on phones (up from 55svh: the dialog locks scroll), 80dvh from md.
	expect(viewer.height).toBeLessThanOrEqual((mobile ? 0.6 : 0.8) * (viewport?.height ?? 0));
});

test("buy bar is on the first screen of the viewer", async ({ page }) => {
	await page.goto("/work/");
	await page.locator('main a[aria-label$=", sold"]').first().click();
	const dialog = page.getByRole("dialog");
	const enquiry = dialog.getByRole("link", { name: "Ask about a similar piece" });
	await expect(enquiry).toBeInViewport();
	expect((await enquiry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
	// Sold pieces show the status, never a price, in the caption and the bar (2.4).
	await expect(dialog.getByText(/INR [\d,]+/)).toHaveCount(0);
	await expect(dialog.getByText("Sold", { exact: true }).first()).toBeVisible();
	await expect(dialog.getByRole("button", { name: /^Share / })).toHaveCount(1);
	const navigation = dialog.getByRole("group", { name: "Artwork navigation" });
	const navBox = await navigation.boundingBox();
	const arrowBox = await navigation.getByRole("button").first().boundingBox();
	expect(navBox?.height ?? 0).toBeLessThanOrEqual((arrowBox?.height ?? 0) + 1);
});

test("browser back closes the artwork viewer", async ({ page }) => {
	await page.goto("/work/");
	const trigger = galleryCards(page).first();
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/piece=/);
	const slug = new URL(page.url()).searchParams.get("piece");
	await page.goBack();
	await expect(dialog).toHaveCount(0);
	expect(new URL(page.url()).pathname).toMatch(/^\/work\/?$/);
	expect(new URL(page.url()).searchParams.has("piece")).toBe(false);
	await expect(trigger).toBeFocused();
	await page.goForward();
	await expect(dialog).toBeVisible();
	expect(new URL(page.url()).searchParams.get("piece")).toBe(slug);
});

test("@mobile filter count is visible and the rail never widens the page", async ({ page }) => {
	await page.goto("/work/");
	await expect(page.getByText(/^Showing all \d+ pieces$/)).toBeVisible();
	await page.getByRole("button", { name: /^Madhubani \d+$/ }).click();
	await expect(page.getByText(/^Showing \d+ Madhubani pieces?$/)).toBeVisible();
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(0);
	await expect(page.locator("main fieldset")).toHaveCSS("overflow-x", "auto");
});

test("availability toggles without clearing style or search on desktop", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/work/?style=Pichwai");
	const styles = page.locator("main fieldset");
	const style = styles.getByRole("button", { name: /^Pichwai \d+$/ });
	const availability = page.getByRole("button", { name: "Available to buy", exact: true });
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	await expect(styles).toHaveCSS("overflow-x", "visible");
	await expect(styles.getByRole("button", { name: "Available to buy" })).toHaveCount(0);
	await search.fill("canvas");
	await availability.click();
	await expect(availability).toHaveAttribute("aria-pressed", "true");
	await expect(style).toHaveAttribute("aria-pressed", "true");
	await expect(search).toHaveValue("canvas");
	expect(new URL(page.url()).searchParams.get("style")).toBe("Pichwai");
	expect(new URL(page.url()).searchParams.get("view")).toBe("available");
	await availability.click();
	await expect(availability).toHaveAttribute("aria-pressed", "false");
	await expect(style).toHaveAttribute("aria-pressed", "true");
	await expect(search).toHaveValue("canvas");
	expect(new URL(page.url()).searchParams.has("view")).toBe(false);
});

test("@mobile deep-linked style pill is visible in the rail", async ({ page }) => {
	await page.goto("/work/?style=Gond");
	await expect(page.getByRole("button", { name: /^Gond \d+$/ })).toBeInViewport();
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

/** The pill's offsets inside its positioned plate and whether it is a full pill. */
async function pillPlacement(pill: Locator) {
	return pill.evaluate((element) => {
		const el = element as HTMLElement;
		const box = el.getBoundingClientRect();
		const radius = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius);
		const parent = el.offsetParent as HTMLElement | null;
		return {
			left: el.offsetLeft,
			top: el.offsetTop,
			bottomGap: parent ? parent.offsetHeight - el.offsetTop - el.offsetHeight : -1,
			fullPill: radius >= box.height / 2,
		};
	});
}

test("status pill is one shape in all three views", async ({ page }) => {
	await page.goto("/work/");
	const soldCard = page.locator('main a[aria-label$=", sold"]').first();
	const path = await soldCard.getAttribute("href");
	// Grid cards pin the pill to the frame's bottom-left so the plate's top edge
	// stays clean (visual-direction 2.2); viewer and detail keep top-left.
	const card = await pillPlacement(soldCard.getByText("Sold", { exact: true }).first());
	expect(card.left).toBe(8);
	expect(card.bottomGap).toBe(8);
	expect(card.fullPill).toBe(true);
	await soldCard.click();
	const dialog = page.getByRole("dialog");
	const viewer = await pillPlacement(
		dialog.locator("figure").getByText("Sold", { exact: true }).first(),
	);
	expect({ left: viewer.left, top: viewer.top, fullPill: viewer.fullPill }).toEqual({
		left: 12,
		top: 12,
		fullPill: true,
	});
	await page.keyboard.press("Escape");
	await page.goto(path as string);
	const detail = await pillPlacement(
		page
			.locator("main img[fetchpriority=high]")
			.locator("xpath=ancestor::div[1]")
			.getByText("Sold", { exact: true }),
	);
	expect({ left: detail.left, top: detail.top, fullPill: detail.fullPill }).toEqual({
		left: 12,
		top: 12,
		fullPill: true,
	});
});

function enquiryBar(page: Page) {
	return page.locator("main > div.fixed");
}

test("@mobile enquiry bar follows the panel", async ({ page }) => {
	await page.goto("/work/");
	const path = await page.locator('main a[aria-label$=", sold"]').first().getAttribute("href");
	await page.goto(path as string);
	const bar = enquiryBar(page);
	await expect(bar).toHaveAttribute("aria-hidden", "false");
	await expect(bar).not.toHaveAttribute("inert", /.*/);
	const barLink = bar.getByRole("link", { name: "Ask about a similar piece" });
	const panelHref = await page.locator('#enquire a[href^="https://wa.me/"]').getAttribute("href");
	await expect(barLink).toHaveAttribute("href", panelHref as string);
	await page.locator("#enquire").scrollIntoViewIfNeeded();
	await expect(bar).toHaveAttribute("aria-hidden", "true", { timeout: 500 });
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await expect(bar).toHaveAttribute("aria-hidden", "true");
});

test("enquiry bar stays off desktop", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	await page.goto(path as string);
	await expect(enquiryBar(page)).toBeHidden();
});

test("failed images say so", async ({ page }) => {
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	await page.unroute("**/media/**");
	await page.route("**/media/**", (route) => route.abort());
	await page.route("**/artworks/*.jpg", (route) => route.abort());
	await page.goto(path as string);
	await expect(page.getByRole("main").getByText("Image unavailable").first()).toBeVisible();
});

test("artwork detail page has no accessibility violations", async ({ page }) => {
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	await page.goto(path as string);
	await settleAnimations(page);
	const accessibility = await new AxeBuilder({ page })
		.include("main")
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
});

test("cards retain screen-reader positions and filters show counts", async ({ page }) => {
	await page.goto("/work/");
	const cards = galleryCards(page);
	await expect(cards.first()).toBeVisible();
	const total = await cards.count();
	const positions = cards.locator("span.sr-only").filter({ hasText: /^Piece \d+ of \d+$/ });
	await expect(positions).toHaveCount(total);
	await expect(positions.first()).toHaveText(`Piece 1 of ${total}`);
	await expect(page.getByRole("button", { name: `All ${total}`, exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: /^Madhubani \d+$/ })).toBeVisible();
});

test("detail orders price before the full-width enquiry, one price on the page", async ({
	page,
}) => {
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	await page.goto(path as string);
	// The wall-label price is the one price outside the sticky bar; the CTA
	// panel no longer repeats it (visual-direction 2.3, the B graft).
	await expect(page.locator("main #enquire").getByText(/INR [\d,]+/)).toHaveCount(0);
	const prices = page.locator("main > :not(div.fixed)").getByText(/^INR [\d,]+$/);
	await expect(prices).toHaveCount(1);
	// Art > label > price > CTA: the panel precedes the description in the DOM.
	const panelBeforeDescription = await page.evaluate(() => {
		const panel = document.querySelector("#enquire");
		const description = document.querySelector("main .t-body");
		if (!panel || !description) return description === null;
		return Boolean(panel.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING);
	});
	expect(panelBeforeDescription).toBe(true);
	// The artwork and its label no longer carry decorative divider rules.
	await expect(page.locator("main .rule-draw")).toHaveCount(0);
	// The Expand affordance opens the viewer and is 44px.
	const expand = page.getByRole("button", { name: "View full screen" });
	const expandBox = await expand.boundingBox();
	expect(expandBox?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(expandBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	await expand.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(expand).toBeFocused();
});

test("sold detail offers the available artwork collection", async ({ page }) => {
	await page.goto("/work/");
	const path = await page.locator('main a[aria-label$=", sold"]').first().getAttribute("href");
	await page.goto(path as string);
	// No price renders; the wall label carries the status instead.
	await expect(page.locator("main").getByText(/^INR [\d,]+$/)).toHaveCount(0);
	await expect(page.locator("main").getByText("Sold", { exact: true }).first()).toBeVisible();
	const related = page.getByRole("link", { name: "Browse available artwork" });
	await expect(related).toBeVisible();
	expect(await related.getAttribute("href")).toContain("view=available");
});
