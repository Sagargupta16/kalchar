import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";
import type { OrderPreset } from "../../lib/types";
import type { actionState, navigate } from "../admin/mock-actions";

const presets: OrderPreset[] = [
	{ id: "a4", label: "A4", kind: "size", order: 0 },
	{ id: "a3", label: "A3", kind: "size", order: 1 },
	{ id: "a2", label: "A2", kind: "size", order: 2 },
	{ id: "small", label: "Under INR 5,000", kind: "budget", order: 3 },
	{ id: "large", label: "INR 5,000 to 10,000", kind: "budget", order: 4 },
	{ id: "month", label: "Within a month", kind: "timeline", order: 5 },
];

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		renderPresets: (items: OrderPreset[]) => void;
	}
}

let bundle: Promise<string> | undefined;

async function mountPresets(page: Page, items = presets) {
	// A page-owned entry lets us deliver refreshed props without editing the
	// shared fixture. Every mutation and router call uses the existing mock.
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode } from "react";
				import { createRoot } from "react-dom/client";
				import { PresetManager } from "./app/admin/_components/preset-manager";
				import { ConfirmProvider } from "./app/admin/_components/confirm-dialog";
				import { actionState, navigate } from "./tests/admin/mock-actions";
				window.adminTest = Object.assign(actionState, { navigate });
				const root = createRoot(document.getElementById("fixture"));
				window.renderPresets = (presets) => root.render(
					<StrictMode><ConfirmProvider><PresetManager presets={presets} /></ConfirmProvider></StrictMode>
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
		define: { "process.env.NODE_ENV": JSON.stringify("development") },
		alias: { "@": resolve(".") },
		logLevel: "silent",
		plugins: [
			{
				name: "isolated-preset-actions",
				setup(builder) {
					builder.onResolve({ filter: /(^next\/navigation$|\/actions$)/ }, () => ({
						path: resolve("tests/admin/mock-actions.ts"),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	await page.setContent(`
		<html><head><title>Preset component checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate((next) => window.renderPresets(next), items);
}

async function hasUnsavedWarning(page: Page) {
	return page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

async function outcome(page: Page, value: Window["adminTest"]["outcome"]) {
	await page.evaluate((next) => {
		window.adminTest.outcome = next;
	}, value);
}

test("presets: refreshed labels and additions keep the staged order until reset", async ({
	page,
}) => {
	await mountPresets(page);
	const sizes = page.getByRole("region", { name: "Sizes", exact: true });
	await sizes.getByRole("button", { name: "Reorder A4, position 1 of 3" }).press("ArrowDown");
	await page.evaluate((next) => window.renderPresets(next), [
		...presets.map((preset) => (preset.id === "a4" ? { ...preset, label: "A4 portrait" } : preset)),
		{ id: "square", label: "Square", kind: "size", order: 6 },
	] satisfies OrderPreset[]);
	await expect(
		sizes.getByRole("button", { name: "Reorder A4 portrait, position 2 of 4" }),
	).toBeVisible();
	await expect(sizes.getByRole("button", { name: "Save order" })).toBeVisible();
	await sizes.getByRole("button", { name: "Reset", exact: true }).click();
	await expect(
		sizes.getByRole("button", { name: "Reorder A4 portrait, position 1 of 4" }),
	).toBeVisible();
	await expect(sizes.getByRole("button", { name: "Save order" })).toHaveCount(0);
});

test("presets: rename failure stays beside its draft and retry updates the row and preview", async ({
	page,
}) => {
	await mountPresets(page);
	const sizes = page.getByRole("region", { name: "Sizes", exact: true });
	const row = sizes.getByRole("listitem").first();
	await row.getByRole("button", { name: "Rename A4", exact: true }).click();
	const label = row.getByRole("textbox", { name: "Rename A4", exact: true });
	await label.fill("A4 portrait");
	await label.press("Enter");
	await expect(row.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(label).toHaveValue("A4 portrait");
	await outcome(page, "success");
	await label.press("Enter");
	await expect(row.getByRole("button", { name: "Rename A4 portrait" })).toBeFocused();
	await expect(
		sizes.locator('div[aria-hidden="true"]').filter({ hasText: "How the order form shows them" }),
	).toContainText("A4 portrait");
});

test("presets: Escape and unchanged edits return focus without a request", async ({ page }) => {
	await mountPresets(page);
	const rename = page.getByRole("button", { name: "Rename A4", exact: true });
	await rename.click();
	await page.getByRole("textbox", { name: "Rename A4", exact: true }).press("Escape");
	await expect(rename).toBeFocused();
	await rename.press("Enter");
	await page.getByRole("textbox", { name: "Rename A4", exact: true }).press("Enter");
	await expect(rename).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("presets: blank rename explains the problem and keeps keyboard focus", async ({ page }) => {
	await mountPresets(page);
	const row = page
		.getByRole("region", { name: "Sizes", exact: true })
		.getByRole("listitem")
		.first();
	await row.getByRole("button", { name: "Rename A4", exact: true }).click();
	const label = row.getByRole("textbox", { name: "Rename A4", exact: true });
	await label.fill("   ");
	await label.press("Enter");
	await expect(row.getByRole("alert")).toHaveText("Enter an option label");
	await expect(label).toHaveAttribute("aria-invalid", "true");
	await expect(label).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("presets: pending rename is busy, blocks repeat submits, and retains a rejected draft", async ({
	page,
}) => {
	await mountPresets(page);
	await page.getByRole("button", { name: "Rename A4", exact: true }).click();
	const label = page.getByRole("textbox", { name: "Rename A4", exact: true });
	await label.fill("A4 portrait");
	await outcome(page, "pending");
	const save = page.getByRole("button", { name: "Save A4", exact: true });
	await save.dblclick();
	await expect(save).toHaveAttribute("aria-busy", "true");
	await expect(save).toBeDisabled();
	await expect(label).toBeDisabled();
	await expect(page.getByRole("button", { name: "Add size", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Add budget", exact: true })).toBeEnabled();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
	await outcome(page, "throw");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("alert")).toHaveText("Connection interrupted.");
	await expect(label).toHaveValue("A4 portrait");
	await expect(label).toBeEnabled();
});

test("presets: deleting stays in its dialog through pending, failure and retry", async ({
	page,
}) => {
	await mountPresets(page);
	await page.getByRole("button", { name: "Delete A4", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: 'Delete "A4"?' });
	await outcome(page, "pending");
	const remove = dialog.getByRole("button", { name: "Delete option", exact: true });
	await remove.click();
	await expect(remove).toBeDisabled();
	await expect(remove).toHaveAttribute("aria-busy", "true");
	await expect(dialog.getByRole("button", { name: "Keep option" })).toBeDisabled();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
	await outcome(page, "success");
	await remove.click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Delete A4", exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Rename A3", exact: true })).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
});

test("presets: each empty group retains failed additions and accepts its first option", async ({
	page,
}) => {
	await mountPresets(page, []);
	const next: OrderPreset[] = [];
	for (const [kind, label] of [
		["size", "A4 portrait"],
		["budget", "Under INR 5,000"],
		["timeline", "Within a month"],
	] as const) {
		const input = page.getByRole("textbox", { name: `New ${kind} option` });
		await input.fill(label);
		await outcome(page, "failure");
		await input.press("Enter");
		await expect(input).toHaveValue(label);
		await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
		await outcome(page, "success");
		await page.getByRole("button", { name: `Add ${kind}`, exact: true }).click();
		await expect(input).toHaveValue("");
		await expect(input).toBeFocused();
		next.push({ id: kind, kind, label, order: next.length });
		await page.evaluate((items) => window.renderPresets(items), next);
		await expect(page.getByRole("button", { name: `Rename ${label}`, exact: true })).toBeVisible();
	}
	await expect(page.getByRole("button", { name: "Save order" })).toHaveCount(0);
});

test("presets: switching groups and refreshing preserves other drafts and order", async ({
	page,
}) => {
	await mountPresets(page);
	await page.getByRole("button", { name: "Reorder A4, position 1 of 3" }).press("End");
	await page.getByRole("button", { name: "Rename A3", exact: true }).click();
	await page.getByRole("textbox", { name: "Rename A3", exact: true }).fill("Unfinished size");
	await page.getByRole("textbox", { name: "New size option" }).fill("Square");
	await page.getByRole("textbox", { name: "New budget option" }).fill("Over INR 10,000");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Add budget", exact: true }).click();
	await page.evaluate((items) => window.renderPresets(items), [
		...presets,
		{ id: "new-budget", label: "Over INR 10,000", kind: "budget", order: 6 },
	] satisfies OrderPreset[]);
	await expect(page.getByRole("textbox", { name: "Rename A3", exact: true })).toHaveValue(
		"Unfinished size",
	);
	await expect(page.getByRole("textbox", { name: "New size option" })).toHaveValue("Square");
	await expect(page.getByRole("button", { name: "Reorder A4, position 3 of 3" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order" })).toBeVisible();
});

test("presets: a pending addition blocks duplicate clicks and keeps its draft after failure", async ({
	page,
}) => {
	await mountPresets(page);
	const input = page.getByRole("textbox", { name: "New size option" });
	await input.fill("  Square  ");
	await outcome(page, "pending");
	const add = page.getByRole("button", { name: "Add size", exact: true });
	await add.dblclick();
	await expect(add).toBeDisabled();
	await expect(add).toHaveAttribute("aria-busy", "true");
	await expect(input).toBeDisabled();
	await expect(page.getByRole("button", { name: "Rename A4", exact: true })).toBeDisabled();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([
		{ name: "createOrderPreset", args: ["size", "Square"] },
	]);
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(input).toHaveValue("  Square  ");
	await outcome(page, "success");
	await input.press("Enter");
	await expect(input).toHaveValue("");
	await expect(input).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
});

test("presets: cancelled deletion keeps the option and deleting the last one focuses Add", async ({
	page,
}) => {
	await mountPresets(page);
	const timelines = page.getByRole("region", { name: "Timelines", exact: true });
	await expect(
		timelines.getByRole("button", { name: "Reorder Within a month, position 1 of 1" }),
	).toBeDisabled();
	const remove = timelines.getByRole("button", { name: "Delete Within a month", exact: true });
	await remove.click();
	await page.getByRole("dialog").getByRole("button", { name: "Keep option" }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(remove).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
	await outcome(page, "success");
	await remove.click();
	await page.getByRole("dialog").getByRole("button", { name: "Delete option" }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(timelines.getByText("No timelines yet. Add the first one below.")).toBeVisible();
	await expect(timelines.getByRole("textbox", { name: "New timeline option" })).toBeFocused();
});

test("presets: drag ordering stays within its group and is staged until saved", async ({
	page,
}) => {
	await mountPresets(page);
	const sizes = page.getByRole("region", { name: "Sizes", exact: true });
	const first = sizes.getByRole("listitem").filter({
		has: page.getByRole("button", { name: "Rename A4", exact: true }),
	});
	const last = sizes.getByRole("listitem").filter({
		has: page.getByRole("button", { name: "Rename A2", exact: true }),
	});
	await first.dragTo(last);
	await expect(sizes.getByRole("button", { name: "Reorder A4, position 3 of 3" })).toBeVisible();
	await expect(sizes.getByRole("button", { name: "Save order" })).toBeVisible();
	await first.dragTo(
		page.getByRole("region", { name: "Budgets", exact: true }).getByRole("listitem").first(),
	);
	await expect(sizes.getByRole("button", { name: "Reorder A4, position 3 of 3" })).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Budgets", exact: true }).getByRole("listitem"),
	).toHaveCount(2);
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("presets: create, rename and order drafts warn before reload until cleared", async ({
	page,
}) => {
	await mountPresets(page);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	const input = page.getByRole("textbox", { name: "New size option" });
	await input.fill("Square");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await input.fill("");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await page.getByRole("button", { name: "Rename A4", exact: true }).click();
	await page.getByRole("textbox", { name: "Rename A4", exact: true }).fill("Portrait");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await page.getByRole("textbox", { name: "Rename A4", exact: true }).press("Escape");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await page.getByRole("button", { name: "Reorder A4, position 1 of 3" }).press("ArrowDown");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await outcome(page, "success");
	await page.getByRole("button", { name: "Save order" }).click();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

test("presets: order errors retain the staged order and retry submits only that group", async ({
	page,
}) => {
	await mountPresets(page);
	const sizes = page.getByRole("region", { name: "Sizes", exact: true });
	await sizes.getByRole("button", { name: "Move A4 down", exact: true }).click();
	await sizes.getByRole("button", { name: "Save order" }).click();
	await expect(sizes.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(sizes.getByRole("button", { name: "Reorder A4, position 2 of 3" })).toBeVisible();
	await outcome(page, "success");
	await sizes.getByRole("button", { name: "Save order" }).click();
	await expect(sizes.getByText("Order saved", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls.at(-1))).toEqual({
		name: "reorderOrderPresets",
		args: [["a3", "a4", "a2"]],
	});
	await sizes.getByRole("button", { name: "Reorder A4, position 2 of 3" }).press("End");
	await expect(sizes.getByRole("button", { name: "Save order" })).toBeVisible();
});

test.describe("presets layout @preview", () => {
	test.skip(process.env.KALCHAR_ADMIN_PREVIEW !== "1", "uses the running safe preview");
	test.use({ hasTouch: true });
	for (const width of [320, 390, 1280]) {
		test(`editing and reorder controls fit at ${width}px`, async ({ page }, testInfo) => {
			await page.setViewportSize({ width, height: 844 });
			await page.route("**/*", (route) =>
				route.request().method() === "GET" ? route.continue() : route.abort(),
			);
			await page.goto("http://localhost:3010/admin/presets");
			await expect(
				page.getByRole("heading", { name: "Custom-order presets", exact: true }),
			).toBeVisible();
			const sizes = page.getByRole("region", { name: "Sizes", exact: true });
			const row = sizes.getByRole("listitem").first();
			await row.getByRole("button", { name: /^Rename / }).click();
			await expect(row.getByRole("textbox")).toBeFocused();
			expect(await row.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
				true,
			);
			await row.getByRole("textbox").press("Escape");
			await expect(row.getByRole("button", { name: /^Rename / })).toBeFocused();
			await row.getByRole("button", { name: /^Move .* down$/ }).click();
			await expect(sizes.getByRole("button", { name: "Save order" })).toBeVisible();
			await page.screenshot({ path: testInfo.outputPath(`presets-${width}.png`), fullPage: true });
			expect(await sizes.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
				true,
			);
			const hintLines = await sizes
				.getByText("For example A4 (8 x 12 inches)", { exact: true })
				.evaluate(
					(element) =>
						element.clientHeight / Number.parseFloat(getComputedStyle(element).lineHeight),
				);
			expect(hintLines).toBeLessThanOrEqual(3);
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
				),
			).toBe(true);
			await sizes.getByRole("button", { name: "Reset", exact: true }).click();
		});
	}
});
