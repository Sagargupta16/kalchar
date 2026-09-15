import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { build } from "esbuild";

interface MotionObservation {
	frame: number;
	peakScale: number;
	restingFrames: number;
}

declare global {
	interface Window {
		featuredMotion: MotionObservation;
	}
}

const RESTING_FRAMES = 3;
const VISIBLE_POP_SCALE = 1.05;
let bundle: Promise<string> | undefined;

async function mountFeaturedToggle(page: Page) {
	// Bundle the actual component and development Motion so runtime invariants
	// stay enabled. Local React state is the only owner; no server actions run.
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode, useState } from "react";
				import { createRoot } from "react-dom/client";
				import { MotionConfig } from "motion/react";
				import { FeaturedToggle } from "./app/admin/_components/artwork-quick-state";
				function Fixture() {
					const [featured, setFeatured] = useState(false);
					return <FeaturedToggle title="Alpha" featured={featured} disabled={false} onChange={setFeatured} />;
				}
				createRoot(document.getElementById("fixture")).render(
					<StrictMode><MotionConfig reducedMotion="never"><Fixture /></MotionConfig></StrictMode>
				);
			`,
			resolveDir: resolve("."),
			loader: "tsx",
		},
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		jsx: "automatic",
		// Motion's invariant also checks typeof process, not just NODE_ENV.
		define: { process: JSON.stringify({ env: { NODE_ENV: "development" } }) },
		alias: { "@": resolve(".") },
		logLevel: "silent",
	}).then((result) => result.outputFiles[0]!.text);
	await page.setContent(`
		<html><head><title>Featured artwork motion</title>
		<style>.grid { display: grid; }</style>
		</head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
}

async function observeScale(icon: Locator) {
	await icon.evaluate((element) => {
		const observation: MotionObservation = { frame: 0, peakScale: 1, restingFrames: 0 };
		window.featuredMotion = observation;
		const sample = () => {
			const transform = getComputedStyle(element).transform;
			const scale = new DOMMatrixReadOnly(transform).a;
			observation.peakScale = Math.max(observation.peakScale, scale);
			const running = element
				.getAnimations()
				.some((animation) => animation.playState === "running");
			observation.restingFrames =
				transform === "none" && !running ? observation.restingFrames + 1 : 0;
			observation.frame = requestAnimationFrame(sample);
		};
		observation.frame = requestAnimationFrame(sample);
	});
}

test("featured toggle pops and settles with real Motion on repeated on/off changes", async ({
	page,
}, testInfo) => {
	const pageErrors: string[] = [];
	const consoleErrors: string[] = [];
	const observations: Array<{ featured: boolean; peakScale: number; restingFrames: number }> = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") consoleErrors.push(message.text());
	});

	try {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await mountFeaturedToggle(page);
		const toggle = page.getByRole("button", { name: "Feature Alpha", exact: true });
		const icon = toggle.locator("span");
		await expect(toggle).toHaveAttribute("aria-pressed", "false");
		await expect(icon).toHaveCSS("transform", "none");

		for (const featured of [true, false, true, false]) {
			await observeScale(icon);
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-pressed", String(featured));
			if (featured) {
				await expect
					.poll(() => page.evaluate(() => window.featuredMotion.peakScale))
					.toBeGreaterThan(VISIBLE_POP_SCALE);
			}
			// Require fresh resting frames after the interaction, not the idle
			// frames before Motion received the updated pressed state.
			await page.evaluate(() => {
				window.featuredMotion.restingFrames = 0;
			});
			await expect
				.poll(() => page.evaluate(() => window.featuredMotion.restingFrames))
				.toBeGreaterThanOrEqual(RESTING_FRAMES);
			await expect(icon).toHaveCSS("transform", "none");
			const observation = await page.evaluate(() => {
				cancelAnimationFrame(window.featuredMotion.frame);
				const { peakScale, restingFrames } = window.featuredMotion;
				return { peakScale, restingFrames };
			});
			observations.push({ featured, ...observation });
			expect(pageErrors, "Motion must finish without uncaught browser errors").toHaveLength(0);
			expect(consoleErrors, "Motion must finish without console errors").toHaveLength(0);
		}
	} finally {
		await testInfo.attach("featured-motion-evidence", {
			body: JSON.stringify({ observations, pageErrors, consoleErrors }, null, 2),
			contentType: "application/json",
		});
		expect(pageErrors, "Uncaught errors from the real Motion runtime").toHaveLength(0);
		expect(consoleErrors, "Console errors from the real Motion runtime").toHaveLength(0);
	}
});
