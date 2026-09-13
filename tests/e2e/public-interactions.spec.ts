import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, type Route, test } from "@playwright/test";

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
	// The buy bar puts the enquiry link on the first screen of the modal on both projects.
	const enquiry = page.getByRole("dialog").getByRole("link", { name: "Enquire on WhatsApp" });
	await expect(enquiry).toBeInViewport();
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

test("event viewer escapes a transformed clipped card and keeps keyboard focus inside", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/events/");
	const article = page.locator("main article").first();
	// A populated catalog fixture is required for this regression.
	const trigger = article.getByRole("button", { name: /^View photo 1 from / });
	await expect(article).not.toHaveCSS("transform", "none");
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	expect(await dialog.evaluate((element) => element.parentElement === document.body)).toBe(true);
	const box = await dialog.boundingBox();
	const viewport = page.viewportSize();
	expect(box?.x).toBe(0);
	expect(box?.y).toBe(0);
	expect(box?.width).toBe(viewport?.width);
	expect(box?.height).toBe(viewport?.height);
	await page.screenshot({
		path: test.info().outputPath("event-viewer.png"),
		animations: "disabled",
	});
	await expectModalFocus(
		page,
		trigger,
		dialog.getByRole("button", { name: "Next photo", exact: true }),
	);
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
	expect(viewer.height).toBeLessThanOrEqual((mobile ? 0.55 : 0.8) * (viewport?.height ?? 0));
});

test("buy bar is on the first screen of the viewer", async ({ page }) => {
	await page.goto("/work/");
	await page.locator('main a[aria-label$=", sold"]').first().click();
	const dialog = page.getByRole("dialog");
	const enquiry = dialog.getByRole("link", { name: "Ask about a similar piece" });
	await expect(enquiry).toBeInViewport();
	expect((await enquiry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
	await expect(dialog.getByText("INR 1,000")).toBeInViewport();
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

async function swipeImagePanel(page: Page, dx: number, dy: number) {
	await page
		.getByRole("dialog")
		.locator("figure")
		.evaluate(
			(figure, delta) => {
				const panel = figure.parentElement as HTMLElement;
				const touchAt = (x: number, y: number) =>
					new Touch({ identifier: 1, target: panel, clientX: x, clientY: y });
				const start = touchAt(200, 300);
				const end = touchAt(200 + delta.dx, 300 + delta.dy);
				panel.dispatchEvent(
					new TouchEvent("touchstart", {
						bubbles: true,
						cancelable: true,
						touches: [start],
						changedTouches: [start],
					}),
				);
				panel.dispatchEvent(
					new TouchEvent("touchend", {
						bubbles: true,
						cancelable: true,
						touches: [],
						changedTouches: [end],
					}),
				);
			},
			{ dx, dy },
		);
}

test("@mobile swipe locks to the horizontal axis", async ({ page }) => {
	await page.goto("/work/");
	await galleryCards(page).first().click();
	const title = page.getByRole("dialog").locator("#lightbox-title");
	const initial = await title.innerText();
	await swipeImagePanel(page, 40, 120);
	await expect(title).toHaveText(initial);
	await swipeImagePanel(page, 80, 10);
	await expect(title).not.toHaveText(initial);
});

/** The pill's offset inside its positioned plate and whether it is a full pill. */
async function pillPlacement(pill: Locator) {
	return pill.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
		return {
			left: (element as HTMLElement).offsetLeft,
			top: (element as HTMLElement).offsetTop,
			fullPill: radius >= box.height / 2,
		};
	});
}

test("status pill is one shape in all three views", async ({ page }) => {
	await page.goto("/work/");
	const soldCard = page.locator('main a[aria-label$=", sold"]').first();
	const path = await soldCard.getAttribute("href");
	const card = await pillPlacement(soldCard.getByText("Sold", { exact: true }));
	expect(card).toEqual({ left: 12, top: 12, fullPill: true });
	await soldCard.click();
	const dialog = page.getByRole("dialog");
	const viewer = await pillPlacement(dialog.locator("figure").getByText("Sold", { exact: true }));
	expect(viewer).toEqual({ left: 12, top: 12, fullPill: true });
	await page.keyboard.press("Escape");
	await page.goto(path as string);
	const detail = await pillPlacement(
		page.locator("main img[fetchpriority=high]").locator("xpath=ancestor::div[1]").getByText("Sold", { exact: true }),
	);
	expect(detail).toEqual({ left: 12, top: 12, fullPill: true });
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

async function interceptLead(page: Page, handler: (route: Route) => Promise<void>) {
	await page.route(/\/custom-orders\/?(?:\?.*)?$/, (route) => {
		if (route.request().method() === "POST") return handler(route);
		return route.continue();
	});
}

async function leadResponse(route: Route, ok: boolean) {
	await route.fulfill({
		contentType: "text/x-component",
		body: `0:${JSON.stringify({ a: { ok }, f: "" })}\n`,
	});
}

test("empty enquiries are rejected before any lead request", async ({ page }) => {
	let submissions = 0;
	await interceptLead(page, async (route) => {
		submissions += 1;
		await leadResponse(route, false);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("   ");
	await page.getByRole("button", { name: "Prepare enquiry" }).click();
	await expect(page.locator("form").getByRole("alert")).toContainText("Tell us a bit");
	await expect(page.locator('form a[href^="https://wa.me/"]')).toHaveCount(0);
	expect(submissions).toBe(0);
});

test("failed lead saves retain explicit WhatsApp/email links with the reply contact", async ({
	page,
}) => {
	let submittedBody = "";
	await page.addInitScript(() => {
		globalThis.open = () => {
			document.body.dataset.scriptedPopup = "true";
			return null;
		};
	});
	await interceptLead(page, async (route) => {
		submittedBody = route.request().postData() ?? "";
		await leadResponse(route, false);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("A blue and gold peacock");
	const contact = page.getByLabel("Email or WhatsApp number");
	await expect(contact).toHaveAttribute("maxlength", "200");
	await contact.fill("visitor@example.com");
	await page.getByRole("button", { name: "Prepare enquiry" }).click();
	await expect(page.locator("form").getByRole("alert")).toContainText(
		"couldn’t confirm your enquiry was saved",
	);
	expect(submittedBody).toContain("visitor@example.com");
	const whatsapp = page.locator('form a[href^="https://wa.me/"]');
	await expect(whatsapp).toBeVisible();
	await expect(whatsapp).toHaveAttribute("target", "_blank");
	await expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
	const message = new URL((await whatsapp.getAttribute("href")) ?? "").searchParams.get("text");
	expect(message).toContain("A blue and gold peacock");
	expect(message).toContain("Contact: visitor@example.com");
	await expect(page.locator('form a[href^="mailto:"]')).toBeVisible();
	await expect(page.getByRole("button", { name: "Try saving again" })).toBeEnabled();
	await expect(page.locator("body")).not.toHaveAttribute("data-scripted-popup", "true");
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
});

test("saving is reported only after acknowledgement and never gates the WhatsApp link", async ({
	page,
}) => {
	let release!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	await interceptLead(page, async (route) => {
		await pending;
		await leadResponse(route, true);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("A forest scene");
	await page.getByLabel("Email or WhatsApp number").fill("visitor@example.com");
	await page.getByRole("button", { name: "Prepare enquiry" }).click();
	try {
		await expect(page.getByRole("button", { name: "Saving enquiry..." })).toBeDisabled();
		await expect(page.locator('form a[href^="https://wa.me/"]')).toBeVisible();
		await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
	} finally {
		release();
	}
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	await expect(
		page.getByText("We'll use your contact details to reply.", { exact: false }),
	).toBeVisible();
});

test("an old save response cannot mark an edited enquiry as saved", async ({ page }) => {
	let release!: () => void;
	let releaseEdited!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	const editedPending = new Promise<void>((resolve) => {
		releaseEdited = resolve;
	});
	let submissions = 0;
	await interceptLead(page, async (route) => {
		submissions += 1;
		await (submissions === 1 ? pending : editedPending);
		await leadResponse(route, true);
	});
	await page.goto("/custom-orders/");
	const brief = page.getByLabel("What would you like painted?");
	await brief.fill("The original brief");
	const request = page.waitForRequest(
		(request) =>
			request.method() === "POST" && new URL(request.url()).pathname === "/custom-orders/",
	);
	await page.getByRole("button", { name: "Prepare enquiry" }).click();
	await request;
	await brief.fill("The edited brief");
	const editedRequest = page.waitForRequest(
		(request) =>
			request.method() === "POST" && (request.postData() ?? "").includes("The edited brief"),
	);
	await page.getByRole("button", { name: "Prepare enquiry" }).click();
	release();
	try {
		await editedRequest;
		await expect(page.getByRole("button", { name: "Saving enquiry..." })).toBeDisabled();
		await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
		const href = await page.locator('form a[href^="https://wa.me/"]').getAttribute("href");
		expect(new URL(href as string).searchParams.get("text")).toContain("The edited brief");
	} finally {
		releaseEdited();
	}
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
});
