import type { Page } from "@playwright/test";

/** Exercise real reveals, then finish finite animations before a static accessibility audit. */
export async function settleAnimations(page: Page, selector = "body") {
	await page.evaluate(async (scope) => {
		await document.fonts.ready;
		const root = document.querySelector(scope);
		if (!root) throw new Error(`Animation audit scope not found: ${scope}`);
		const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const settle = async () => {
			// IntersectionObserver and Motion schedule their work on consecutive frames.
			await frame();
			await frame();
			for (const animation of document.getAnimations()) {
				const end = animation.effect?.getComputedTiming().endTime;
				if (typeof end !== "number" || !Number.isFinite(end)) continue;
				try {
					animation.finish();
				} catch {
					// Scroll timelines have no finite wall-clock endpoint.
				}
			}
			await frame();
		};
		const original = { left: scrollX, top: scrollY, behavior: "instant" as const };
		if (scope === "body") {
			for (const reveal of root.querySelectorAll<HTMLElement>("[data-motion-reveal]")) {
				reveal.scrollIntoView({ behavior: "instant", block: "center" });
				await settle();
			}
			scrollTo(original);
		}
		await settle();
		await settle();
	}, selector);
}
