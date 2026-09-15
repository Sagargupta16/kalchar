import { expect, type Page } from "@playwright/test";

interface TouchPoint {
	x: number;
	y: number;
}

interface TouchDrag {
	from: TouchPoint;
	to: TouchPoint;
	frames?: number;
}

/** Sample a continuous trusted drag once per animation frame. More frames model a slower finger. */
export async function touchDrag(page: Page, { from, to, frames = 16 }: TouchDrag) {
	const cdp = await page.context().newCDPSession(page);
	try {
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [{ x: from.x, y: from.y }],
		});
		for (let frame = 1; frame <= frames; frame++) {
			await page.evaluate(
				() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
			);
			await cdp.send("Input.dispatchTouchEvent", {
				type: "touchMove",
				touchPoints: [
					{
						x: from.x + ((to.x - from.x) * frame) / frames,
						y: from.y + ((to.y - from.y) * frame) / frames,
					},
				],
			});
		}
		await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
	} finally {
		await cdp.detach();
	}
}

async function imageDrift(element: Element, frames: number) {
	const bounds = () => {
		const { x, y, width, height } = element.getBoundingClientRect();
		return [x, y, width, height];
	};
	const initial = bounds();
	let drift = 0;
	for (let frame = 0; frame < frames; frame++) {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		drift = Math.max(drift, ...bounds().map((value, index) => Math.abs(value - initial[index]!)));
	}
	return drift;
}

/** Wait for a loaded image and stable spring geometry without finishing or changing animations. */
export async function expectViewerReady(page: Page) {
	const dialog = page.getByRole("dialog");
	await expect(dialog).toHaveCSS("opacity", "1");
	const image = dialog.locator("figure img");
	await expect(image).toHaveCount(1);
	await expect(image).toHaveJSProperty("complete", true);
	await expect
		.poll(() =>
			image.evaluate((element) => element instanceof HTMLImageElement && element.naturalWidth > 0),
		)
		.toBe(true);
	const settledFrames = 3;
	const geometryTolerancePx = 0.05;
	await expect
		.poll(() => image.evaluate(imageDrift, settledFrames), {
			message: "The viewer image and springs must settle before the next gesture",
		})
		.toBeLessThanOrEqual(geometryTolerancePx);
}

export async function viewerGeometry(page: Page) {
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

export async function expectZoom(page: Page, level: number) {
	await expect.poll(async () => (await viewerGeometry(page)).scale).toBeCloseTo(level, 2);
	await expectViewerReady(page);
}
