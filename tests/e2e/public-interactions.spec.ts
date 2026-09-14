import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

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
	await expect(page.getByRole("dialog").getByText(/INR [\d,]+/).first()).toBeInViewport();
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

test.describe("responsive artwork delivery", () => {
	test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

	test("two-column cards use the small variant and neighbours preload the displayed source", async ({
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
		await expect
			.poll(() =>
				dialog.locator("figure img").evaluate((image: HTMLImageElement) => image.currentSrc),
			)
			.toBe(preloadedUrl);
	});
});

test("smooth scrolling follows a reduced-motion preference change during the session", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/work/");
	const finePointer = await page.evaluate(
		() => matchMedia("(hover: hover) and (pointer: fine)").matches,
	);
	const root = page.locator("html");
	if (finePointer) await expect(root).toHaveClass(/\blenis\b/);
	else await expect(root).not.toHaveClass(/\blenis\b/);

	await page.emulateMedia({ reducedMotion: "reduce" });
	await expect(root).not.toHaveClass(/\blenis\b/);
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
	await page.getByRole("button", { name: "Madhubani", exact: true }).click();
	await expect(page.getByText(/^Showing \d+ Madhubani pieces?$/)).toBeVisible();
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(0);
	await expect(page.locator("main fieldset")).toHaveCSS("overflow-x", "auto");
	await expect(page.locator('main fieldset > span[aria-hidden="true"]')).toBeHidden();
});

test("filter rail wraps on desktop with the divider visible", async ({ page }) => {
	await page.goto("/work/");
	await expect(page.locator("main fieldset")).toHaveCSS("overflow-x", "visible");
	await expect(page.locator('main fieldset > span[aria-hidden="true"]')).toBeVisible();
});

test("@mobile deep-linked style pill is visible in the rail", async ({ page }) => {
	await page.goto("/work/?style=Gond");
	await expect(page.getByRole("button", { name: "Gond", exact: true })).toBeInViewport();
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

/** Drive the Motion drag with trusted touch input (CDP), stepping so velocity
 *  stays controllable: slow steps stay under DRAG_VELOCITY_PX_S, a short step
 *  time flings. */
async function touchDrag(
	page: Page,
	from: { x: number; y: number },
	to: { x: number; y: number },
	stepMs = 40,
) {
	const cdp = await page.context().newCDPSession(page);
	const steps = 6;
	await cdp.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [{ x: from.x, y: from.y }],
	});
	for (let i = 1; i <= steps; i++) {
		await page.waitForTimeout(stepMs);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [
				{
					x: from.x + ((to.x - from.x) * i) / steps,
					y: from.y + ((to.y - from.y) * i) / steps,
				},
			],
		});
	}
	await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	await cdp.detach();
}

async function figureCentre(page: Page) {
	const box = await page.getByRole("dialog").locator("figure").boundingBox();
	expect(box).not.toBeNull();
	return {
		x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
		y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
		width: box?.width ?? 0,
		height: box?.height ?? 0,
	};
}

test("@mobile a short slow drag springs back; past the threshold it pages", async ({ page }) => {
	await page.goto("/work/");
	await galleryCards(page).first().click();
	const title = page.getByRole("dialog").locator("#lightbox-title");
	const initial = await title.innerText();
	const centre = await figureCentre(page);
	// 40px at low velocity: under DRAG_CLOSE_FRACTION (0.25) of the figure width.
	await touchDrag(page, centre, { x: centre.x - 40, y: centre.y }, 60);
	await expect(title).toHaveText(initial);
	// Past 30 percent of the figure width: commits to the next piece.
	await touchDrag(page, centre, { x: centre.x - Math.max(120, centre.width * 0.45), y: centre.y });
	await expect(title).not.toHaveText(initial);
});

test("@mobile a downward drag past the threshold dismisses the viewer", async ({ page }) => {
	await page.goto("/work/");
	await galleryCards(page).first().click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const centre = await figureCentre(page);
	await touchDrag(page, centre, { x: centre.x, y: centre.y + Math.max(160, centre.height * 0.6) });
	await expect(dialog).toHaveCount(0);
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
	await page.goto("/work/");
	const path = await galleryCards(page).first().getAttribute("href");
	await page.goto(path as string);
	await expect(enquiryBar(page)).toBeHidden();
});

async function expectPressCue(page: Page, control: Locator) {
	const box = await control.boundingBox();
	expect(box).not.toBeNull();
	const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
	const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await expect
		.poll(() => control.evaluate((element) => getComputedStyle(element).transform))
		.toContain("0.97");
	await page.mouse.up();
	await expect
		.poll(() => control.evaluate((element) => getComputedStyle(element).transform))
		.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
}

test("@mobile pressable controls scale on touch", async ({ page }) => {
	await page.goto("/work/");
	await expectPressCue(page, page.getByRole("button", { name: "Madhubani", exact: true }));
	await expectPressCue(page, galleryCards(page).first());
	await expectPressCue(
		page,
		page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }),
	);
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
	const accessibility = await new AxeBuilder({ page })
		.include("main")
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze();
	expect(accessibility.violations).toEqual([]);
});

test("tile wall labels carry the catalogue counter and pills carry counts", async ({ page }) => {
	await page.goto("/work/");
	// Every tile caption opens with the museum counter (visual-direction 2.2).
	const counters = galleryCards(page).locator("p").filter({ hasText: /^No\. \d{2}( of \d+)?$/ });
	expect(await counters.count()).toBeGreaterThan(0);
	await expect(counters.first()).toHaveText(/^No\. \d{2} of \d+$/);
	// Filter pills show their counts as parenthesised numerals.
	await expect(page.getByRole("button", { name: /^All \(\d+\)$/ })).toBeVisible();
	await expect(page.getByRole("button", { name: /^Madhubani \(\d+\)$/ })).toBeVisible();
});

test("@mobile the lead tile spans the full grid width", async ({ page }) => {
	await page.goto("/work/");
	const grid = page.locator("main ul").first();
	const lead = grid.locator("li").first();
	const gridBox = await grid.boundingBox();
	const leadBox = await lead.boundingBox();
	expect(Math.abs((gridBox?.width ?? 0) - (leadBox?.width ?? 0))).toBeLessThanOrEqual(2);
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
	// The gold wall-label bar sits above the label (2px x 32px).
	const bar = page.locator("main span.block.h-0\\.5.w-8").first();
	await expect(bar).toBeVisible();
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

test("sold detail offers the style's available pieces", async ({ page }) => {
	await page.goto("/work/");
	const path = await page.locator('main a[aria-label$=", sold"]').first().getAttribute("href");
	await page.goto(path as string);
	// No price renders; the wall label carries the status instead.
	await expect(page.locator("main").getByText(/^INR [\d,]+$/)).toHaveCount(0);
	await expect(page.locator("main").getByText("Sold", { exact: true }).first()).toBeVisible();
	const related = page.getByRole("link", { name: /^More .+, available$/ });
	await expect(related).toBeVisible();
	expect(await related.getAttribute("href")).toContain("view=available");
});

