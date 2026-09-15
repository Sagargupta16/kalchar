import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { build } from "esbuild";

let bundle: Promise<string> | undefined;

export async function mountCategories(page: Page) {
	bundle ??= build({
		entryPoints: [resolve("tests/admin/categories/fixture.tsx")],
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		jsx: "automatic",
		define: { "process.env.NODE_ENV": JSON.stringify("development") },
		alias: { "@": resolve(".") },
		logLevel: "silent",
		plugins: [
			{
				name: "isolated-category-actions",
				setup(builder) {
					builder.onResolve({ filter: /(^next\/navigation$|\/actions$)/ }, () => ({
						path: resolve("tests/admin/mock-actions.ts"),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	await page.setContent(`
		<html><head><title>Category component checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate(() => window.mountCategories());
}

export async function hasUnsavedWarning(page: Page) {
	return page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

export async function categoryOutcome(page: Page, outcome: Window["adminTest"]["outcome"]) {
	await page.evaluate((value) => {
		window.adminTest.outcome = value;
	}, outcome);
}
