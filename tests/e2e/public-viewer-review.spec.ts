import { expect, type Page, test } from "@playwright/test";

const EDGE_TOLERANCE_PX = 1;

test.beforeEach(async ({ page }) => {
	// These viewer checks need only local reads, even when run against the HMR preview.
	await page.route("**/*", (route) => {
		const request = route.request();
		const url = new URL(request.url());
		return ["GET", "HEAD"].includes(request.method()) &&
			["localhost", "127.0.0.1"].includes(url.hostname)
			? route.continue()
			: route.abort();
	});
});

async function openDetail(page: Page) {
	await page.goto("/work/radha-krishna/");
	await page.evaluate(() => document.fonts.ready);
	await expect(page.locator('main img[fetchpriority="high"]')).toHaveJSProperty("complete", true);
}

async function openViewer(page: Page) {
	const expand = page.getByRole("button", { name: "View full screen", exact: true });
	await expand.focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await expect(dialog).toHaveCSS("opacity", "1");
}

async function viewerGeometry(page: Page) {
	return page
		.getByRole("dialog")
		.locator("figure img")
		.evaluate((image) => {
			const frame = image.closest("figure")?.firstElementChild;
			if (!frame) throw new Error("The artwork clipping frame is missing");
			const bounds = frame.getBoundingClientRect();
			const artwork = image.getBoundingClientRect();
			return {
				scale: artwork.width / bounds.width,
				left: artwork.left - bounds.left,
				top: artwork.top - bounds.top,
				right: bounds.right - artwork.right,
				bottom: bounds.bottom - artwork.bottom,
			};
		});
}

async function expectZoom(page: Page, level: number) {
	await expect.poll(async () => (await viewerGeometry(page)).scale).toBeCloseTo(level, 2);
}

async function zoomAt(page: Page, fraction: number) {
	const box = await page.getByRole("dialog").locator("figure").boundingBox();
	if (!box) throw new Error("The artwork must be visible before zooming");
	const x = box.x + box.width * fraction;
	const y = box.y + box.height * fraction;
	await page.touchscreen.tap(x, y);
	await page.waitForTimeout(90);
	await page.touchscreen.tap(x, y);
	await expectZoom(page, 2.5);
}

/** Trusted touch input exercises the real one-finger pan, without changing the springs. */
async function panAcross(page: Page, direction: 1 | -1) {
	const box = await page.getByRole("dialog").locator("figure").boundingBox();
	if (!box) throw new Error("The artwork must be visible before panning");
	const from = direction === 1 ? 0.1 : 0.9;
	const to = direction === 1 ? 0.9 : 0.1;
	const cdp = await page.context().newCDPSession(page);
	try {
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [{ x: box.x + box.width * from, y: box.y + box.height * from }],
		});
		for (let step = 1; step <= 8; step++) {
			await page.waitForTimeout(40);
			const fraction = from + ((to - from) * step) / 8;
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: [{ x: box.x + box.width * fraction, y: box.y + box.height * fraction }],
			});
		}
		await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	} finally {
		await cdp.detach();
	}
}

async function expectAlignedEdges(
	page: Page,
	edges: readonly ("left" | "top" | "right" | "bottom")[],
) {
	await expect
		.poll(async () => {
			const geometry = await viewerGeometry(page);
			return Math.max(...edges.map((edge) => Math.abs(geometry[edge])));
		})
		.toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
	const geometry = await viewerGeometry(page);
	expect(
		Math.max(geometry.left, geometry.top, geometry.right, geometry.bottom),
	).toBeLessThanOrEqual(EDGE_TOLERANCE_PX);
}

for (const corner of [
	{ name: "bottom-right", fraction: 0.85, direction: -1 },
	{ name: "top-left", fraction: 0.15, direction: 1 },
] as const) {
	test(`@mobile zoom near the ${corner.name} reaches both pan limits without exposing the frame`, async ({
		page,
	}) => {
		await openDetail(page);
		await openViewer(page);
		await zoomAt(page, corner.fraction);
		await panAcross(page, corner.direction);
		await expectAlignedEdges(page, corner.direction === 1 ? ["left", "top"] : ["right", "bottom"]);
		const opposite = corner.direction === 1 ? -1 : 1;
		await panAcross(page, opposite);
		await panAcross(page, opposite);
		await expectAlignedEdges(page, opposite === 1 ? ["left", "top"] : ["right", "bottom"]);
		await expect(page.getByRole("dialog").locator("#lightbox-title")).toHaveText(
			"Radha and Krishna",
		);
	});
}

test("@mobile zooming out after panning keeps the artwork over the clipping frame", async ({
	page,
}) => {
	await openDetail(page);
	await openViewer(page);
	await zoomAt(page, 0.85);
	await page.keyboard.press("+");
	await expectZoom(page, 4);
	for (let drag = 0; drag < 4; drag++) await panAcross(page, 1);
	await page.keyboard.press("-");
	await expectZoom(page, 2.5);
	await expectAlignedEdges(page, ["left", "top"]);
	await page.keyboard.press("-");
	await expectZoom(page, 1);
	await expectAlignedEdges(page, ["left", "top", "right", "bottom"]);
});

async function expectPageUnlocked(page: Page, path: RegExp) {
	await expect(page).toHaveURL(path);
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
	const expand = page.getByRole("button", { name: "View full screen", exact: true });
	await expand.focus();
	await expect(expand).toBeFocused();
}

test("detail viewer closes on soft Back and Forward and restores focus on ordinary close", async ({
	page,
}) => {
	await openDetail(page);
	// Opening once also confirms hydration before following the Next sibling link.
	await openViewer(page);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	const documentStart = await page.evaluate(() => performance.timeOrigin);
	await page
		.getByRole("navigation", { name: "Browse other works" })
		.getByRole("link")
		.first()
		.click();
	await expect(page).toHaveURL(/\/work\/ganesha-pichwai\/$/);
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStart);
	await openViewer(page);
	await expect(page.getByRole("dialog").locator("#lightbox-title")).toHaveText(
		"Ganesha on lotus throne",
	);
	await page.goBack();
	await expectPageUnlocked(page, /\/work\/radha-krishna\/$/);
	await openViewer(page);
	await expect(page.getByRole("dialog").locator("#lightbox-title")).toHaveText("Radha and Krishna");
	await page.goForward();
	await expectPageUnlocked(page, /\/work\/ganesha-pichwai\/$/);
	await openViewer(page);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "View full screen", exact: true })).toBeFocused();
});
