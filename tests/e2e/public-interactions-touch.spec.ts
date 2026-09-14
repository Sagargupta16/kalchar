import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The @mobile CDP touch suite (visual-direction 2.2/2.4), split from
 * public-interactions.spec.ts for the 500-line ceiling: trusted touch drag
 * paging and dismissal, press cues and the lead-tile span. Every case is
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

test("@mobile a downward drag past the threshold dismisses the viewer", async ({ page }) => {
	await page.goto("/work/");
	await galleryCards(page).first().click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const centre = await figureCentre(page);
	await touchDrag(page, centre, { x: centre.x, y: centre.y + Math.max(160, centre.height * 0.6) });
	await expect(dialog).toHaveCount(0);
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

test("@mobile the lead tile spans the full grid width", async ({ page }) => {
	await page.goto("/work/");
	const grid = page.locator("main ul").first();
	const lead = grid.locator("li").first();
	const gridBox = await grid.boundingBox();
	const leadBox = await lead.boundingBox();
	expect(Math.abs((gridBox?.width ?? 0) - (leadBox?.width ?? 0))).toBeLessThanOrEqual(2);
});
