import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The @mobile CDP touch suite (visual-direction 2.2/2.4), split from
 * public-interactions.spec.ts for the 500-line ceiling: trusted touch drag
 * paging and dismissal, press cues and whole-artwork previews. Every case is
 * @mobile-tagged, so the desktop project's grepInvert skips this file.
 */

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({ body: MEDIA_FIXTURE, contentType: "image/jpeg" }),
	);
});

function galleryCards(page: Page) {
	return page.locator('main a[aria-label][href^="/work/"]');
}

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

test("@mobile double tap zooms while a single tap quiets the viewer controls", async ({ page }) => {
	await page.goto("/work/");
	await galleryCards(page).first().click();
	const dialog = page.getByRole("dialog");
	const centre = await figureCentre(page);
	await page.touchscreen.tap(centre.x, centre.y);
	await page.touchscreen.tap(centre.x, centre.y);
	await expect(dialog.locator("[data-zoom]")).toHaveCount(1);
	// Fit is available through the existing keyboard zoom, without a second viewer mode.
	await page.keyboard.press("-");
	await expect(dialog.locator("[data-zoom]")).toHaveCount(0);
	await page.touchscreen.tap(centre.x, centre.y);
	const rail = dialog.locator('nav[aria-label="Artwork thumbnails"]');
	await expect(rail).toHaveAttribute("inert", "");
	await expect(dialog.getByRole("link", { name: "Enquire on WhatsApp" })).toBeInViewport();
	await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeVisible();
	await page.touchscreen.tap(centre.x, centre.y);
	await expect(rail).not.toHaveAttribute("inert", "");
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

for (const viewer of ["artwork", "event"] as const) {
	test(`@mobile diagonal downward drags dismiss the ${viewer} viewer without paging`, async ({
		page,
	}) => {
		if (viewer === "artwork") {
			await page.goto("/work/");
			await galleryCards(page).first().click();
		} else {
			await page.goto("/events/");
			await page.getByRole("button", { name: "View photo 1 from Studio gathering" }).click();
		}
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		const centre = await figureCentre(page);
		await touchDrag(page, centre, { x: centre.x - 120, y: centre.y + 240 });
		await expect(dialog).toHaveCount(0);
	});
}

test("@mobile an unavailable event image preserves the viewer and its navigation", async ({
	page,
}) => {
	await page.unroute("**/media/**");
	await page.route("**/media/**", (route) => route.abort("failed"));
	await page.goto("/events/");
	await page.getByRole("button", { name: "View photo 1 from Studio gathering" }).click();
	const dialog = page.getByRole("dialog");
	const fallback = dialog.getByRole("img", { name: "Studio gathering, photo 1 of 7" });
	await expect(fallback).toBeVisible();
	const box = await fallback.boundingBox();
	expect(box?.width).toBeGreaterThan(200);
	expect(box?.height).toBeGreaterThan(200);
	await dialog.getByRole("button", { name: "Next photo" }).click();
	await expect(dialog.getByRole("img", { name: "Studio gathering, photo 2 of 7" })).toBeVisible();
	await dialog.getByRole("button", { name: "Close", exact: true }).click();
	await expect(dialog).toHaveCount(0);
});

async function expectPressCue(page: Page, control: Locator, dismisses = false) {
	await control.scrollIntoViewIfNeeded();
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
	if (dismisses) {
		await expect(control).toHaveCount(0);
		return;
	}
	await expect
		.poll(() => control.evaluate((element) => getComputedStyle(element).transform))
		.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
}

test("@mobile pressable controls scale on touch", async ({ page }) => {
	await page.goto("/work/");
	await expectPressCue(page, page.getByRole("button", { name: /^Madhubani \d+$/ }));
	await expectPressCue(page, galleryCards(page).first());
	await expectPressCue(
		page,
		page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }),
		true,
	);
});

test("@mobile uniform previews show whole paintings in two columns", async ({ page }) => {
	await page.goto("/work/");
	const cards = galleryCards(page);
	await expect(cards.nth(1)).toBeVisible();
	const first = await cards.first().boundingBox();
	const second = await cards.nth(1).boundingBox();
	if (!first || !second) throw new Error("Both first-row artwork cards must be visible");
	expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(2);
	expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
	expect(second.x).toBeGreaterThan(first.x + first.width);
	const image = cards.first().locator("img");
	await expect(image).toHaveCSS("object-fit", "contain");
	const preview = await image.boundingBox();
	if (!preview) throw new Error("The artwork preview must be visible");
	expect(Math.abs(preview.width / preview.height - 4 / 5)).toBeLessThan(0.02);
});
