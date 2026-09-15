import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";
import type { Workshop } from "../../lib/types";
import type { actionState, navigate } from "../admin/mock-actions";

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		mountWorkshops: (workshops: Workshop[]) => void;
	}
}

const workshops: Workshop[] = ["Alpha", "Bravo", "Charlie"].map((title, index) => ({
	slug: title.toLowerCase(),
	title,
	blurb: "Paint together.",
	order: index + 1,
}));

let bundle: Promise<string> | undefined;

async function outcome(page: Page, next: Window["adminTest"]["outcome"]) {
	await page.evaluate((value) => {
		window.adminTest.outcome = value;
	}, next);
}

// Keep refresh probes and the bundle local to this page's spec. Actions still
// use the existing isolated mock; no server, credentials, or storage is involved.
async function mountWorkshops(page: Page, initial = workshops) {
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode } from "react";
				import { createRoot } from "react-dom/client";
				import { WorkshopManager } from "./app/admin/_components/workshop-manager";
				import { ConfirmProvider } from "./app/admin/_components/confirm-dialog";
				import { actionState, navigate } from "./tests/admin/mock-actions";
				window.adminTest = Object.assign(actionState, { navigate });
				const root = createRoot(document.getElementById("fixture"));
				window.mountWorkshops = (workshops) => root.render(
					<StrictMode><ConfirmProvider>
						<WorkshopManager workshops={workshops} />
					</ConfirmProvider></StrictMode>
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
				name: "isolated-workshop-actions",
				setup(builder) {
					builder.onResolve({ filter: /(^next\/navigation$|\/actions$)/ }, () => ({
						path: resolve("tests/admin/mock-actions.ts"),
					}));
					builder.onResolve({ filter: /^next\/link$/ }, () => ({
						path: resolve("tests/admin/mock-link.tsx"),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	await page.setContent(`
		<html><head><title>Workshop component checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate((rows) => window.mountWorkshops(rows), initial);
}

async function hasUnsavedWarning(page: Page) {
	return page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

async function openCreate(page: Page) {
	await page.getByRole("button", { name: "Add workshop", exact: true }).first().click();
	const form = page.getByRole("form", { name: "Add a workshop" });
	await form.getByRole("textbox", { name: "Title *", exact: true }).fill("Gond painting");
	await form.getByRole("textbox", { name: "Description *", exact: true }).fill("Paint a motif.");
	return form;
}

test("create cancel keeps a draft until discard is confirmed and restores focus", async ({
	page,
}) => {
	await mountWorkshops(page);
	const form = await openCreate(page);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await form.getByRole("button", { name: "Cancel", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Discard changes?" });
	await expect(dialog).toBeVisible();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(form.getByRole("textbox", { name: "Title *", exact: true })).toHaveValue(
		"Gond painting",
	);
	await expect(form.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
	await form.getByRole("button", { name: "Cancel", exact: true }).click();
	await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
	await expect(form).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Add workshop", exact: true })).toBeFocused();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("collapsing an edited row keeps its draft and prevents native row dragging", async ({
	page,
}) => {
	await mountWorkshops(page);
	const row = page.locator("#workshop-alpha");
	const toggle = row.getByRole("button", { name: "Edit Alpha", exact: true });
	await toggle.click();
	const title = row.getByRole("textbox", { name: "Title *", exact: true });
	await expect(title).toBeFocused();
	await expect(row).toHaveAttribute("draggable", "false");
	await title.fill("Unfinished edit");
	await toggle.click();
	const dialog = page.getByRole("dialog", { name: "Discard changes?" });
	await expect(dialog).toBeVisible();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(title).toHaveValue("Unfinished edit");
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await row.getByRole("button", { name: "Cancel", exact: true }).click();
	await dialog.getByRole("button", { name: "Discard changes", exact: true }).click();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(toggle).toBeFocused();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

for (const invalid of [
	{ label: "Title *", value: "   ", message: "Enter a title." },
	{ label: "Description *", value: "\n ", message: "Enter a description." },
	{
		label: "Duration (hours) (optional)",
		value: "0",
		message: "Duration must be a positive number.",
	},
	{
		label: "Duration (hours) (optional)",
		value: "-2",
		message: "Duration must be a positive number.",
	},
	{
		label: "Duration (hours) (optional)",
		value: "two",
		message: "Duration must be a positive number.",
	},
	{
		label: "Duration (hours) (optional)",
		value: "1e40",
		message: "Duration must be a positive number.",
	},
	{
		label: "Duration (hours) (optional)",
		value: "1e-50",
		message: "Duration must be a positive number.",
	},
]) {
	test(`create validates ${invalid.label} ${JSON.stringify(invalid.value)} before calling an action`, async ({
		page,
	}) => {
		await mountWorkshops(page);
		const form = await openCreate(page);
		const field = form.getByRole("textbox", { name: invalid.label, exact: true });
		await field.fill(invalid.value);
		await form.getByRole("button", { name: "Add workshop", exact: true }).click();
		await expect(form.getByRole("alert")).toHaveText(invalid.message);
		await expect(field).toBeFocused();
		await expect(field).toHaveAttribute("aria-invalid", "true");
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
	});
}

test("edit validation focuses the duration and keeps a failed draft retryable", async ({
	page,
}) => {
	await mountWorkshops(page);
	const row = page.locator("#workshop-alpha");
	await row.getByRole("button", { name: "Edit Alpha", exact: true }).click();
	const duration = row.getByRole("textbox", { name: "Duration (hours) (optional)", exact: true });
	await duration.fill("-1");
	await row.getByRole("button", { name: "Save", exact: true }).click();
	await expect(duration).toBeFocused();
	await expect(duration).toHaveAttribute("aria-invalid", "true");
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
	await duration.fill("1.5");
	await outcome(page, "throw");
	await row.getByRole("button", { name: "Save", exact: true }).click();
	await expect(row.getByRole("alert")).toHaveText("Connection interrupted.");
	await expect(duration).toHaveValue("1.5");
	await outcome(page, "success");
	await duration.press("Enter");
	await expect(row.getByText("Saved", { exact: true })).toBeVisible();
	await expect(row.getByRole("button", { name: "Edit Alpha", exact: true })).toContainText(
		"1.5 hours",
	);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

test("a new move immediately replaces the prior order-saved confirmation", async ({ page }) => {
	await mountWorkshops(page);
	await outcome(page, "success");
	const move = page.getByRole("button", { name: "Reorder Alpha, position 1 of 3" });
	await move.focus();
	await move.press("ArrowDown");
	await page.getByRole("button", { name: "Save order", exact: true }).click();
	await expect(page.getByText("Order saved", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Reorder Alpha, position 2 of 3" }).press("ArrowDown");
	await expect(page.getByRole("button", { name: "Save order", exact: true })).toBeVisible({
		timeout: 1000,
	});
	await expect(page.getByText("Order saved", { exact: true })).toHaveCount(0);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
});

test("a refreshed edit keeps staged order while adopting the saved text", async ({ page }) => {
	await mountWorkshops(page);
	await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
	await page.evaluate(
		(rows) => window.mountWorkshops(rows),
		workshops.map((row) => (row.slug === "alpha" ? { ...row, title: "Updated Alpha" } : row)),
	);
	await expect(page.getByRole("listitem").first()).toHaveAttribute("id", "workshop-bravo");
	await expect(page.getByRole("button", { name: "Edit Updated Alpha", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Save order", exact: true })).toBeVisible();
	await outcome(page, "success");
	await page.getByRole("button", { name: "Save order", exact: true }).click();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([
		{ name: "reorderWorkshops", args: [["bravo", "alpha", "charlie"]] },
	]);
});

test("a refreshed list merges additions and removals without losing a staged order or edit draft", async ({
	page,
}) => {
	await mountWorkshops(page);
	await page.getByRole("button", { name: "Move Charlie up", exact: true }).click();
	await page.getByRole("button", { name: "Move Charlie up", exact: true }).click();
	const row = page.locator("#workshop-alpha");
	await row.getByRole("button", { name: "Edit Alpha", exact: true }).click();
	await row.getByRole("textbox", { name: "Title *", exact: true }).fill("Unfinished Alpha");
	await page.evaluate(
		(rows) => window.mountWorkshops(rows),
		[
			workshops[0]!,
			workshops[2]!,
			{ slug: "delta", title: "Delta", blurb: "New session.", order: 4 },
		],
	);
	await expect(page.locator("li[id^='workshop-']")).toHaveCount(3);
	expect(
		await page.locator("li[id^='workshop-']").evaluateAll((rows) => rows.map((row) => row.id)),
	).toEqual(["workshop-charlie", "workshop-alpha", "workshop-delta"]);
	await expect(row.getByRole("textbox", { name: "Title *", exact: true })).toHaveValue(
		"Unfinished Alpha",
	);
	await expect(page.getByRole("button", { name: "Delete Bravo", exact: true })).toHaveCount(0);
});

test("create holds order controls, sends one request, and adds the row after success", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await mountWorkshops(page);
	await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
	const form = await openCreate(page);
	await form
		.getByRole("textbox", { name: "Duration (hours) (optional)", exact: true })
		.fill(" 1.5 ");
	await outcome(page, "pending");
	const title = form.getByRole("textbox", { name: "Title *", exact: true });
	await title.press("Enter");
	await expect(form.getByRole("button", { name: "Add workshop", exact: true })).toBeDisabled();
	await expect(form.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Save order", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Save order", exact: true })).not.toHaveAttribute(
		"aria-busy",
		"true",
	);
	await expect(page.getByRole("button", { name: "Move Alpha up", exact: true })).toBeDisabled();
	await form.evaluate((element) => (element as HTMLFormElement).requestSubmit());
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(form).toHaveCount(0);
	await expect(page.getByRole("listitem").last()).toHaveAttribute("id", "workshop-created-piece");
	await expect(page.getByRole("listitem").first()).toHaveAttribute("id", "workshop-bravo");
	await expect(page.getByRole("button", { name: "Edit Gond painting", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit Gond painting", exact: true })).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.formSubmissions)).toEqual([
		{ title: "Gond painting", blurb: "Paint a motif.", durationHours: "1.5" },
	]);
});

test("delete stays pending in its confirmation, exposes a failure, retries, and restores focus", async ({
	page,
}) => {
	await mountWorkshops(page);
	await page.getByRole("button", { name: "Delete Alpha", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: 'Delete "Alpha"?' });
	await outcome(page, "pending");
	await dialog.getByRole("button", { name: "Delete workshop", exact: true }).click();
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Delete workshop", exact: true })).toBeDisabled();
	await expect(dialog.getByRole("button", { name: "Keep workshop", exact: true })).toBeDisabled();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeVisible();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.locator("#workshop-alpha")).toHaveCount(1);
	await outcome(page, "success");
	await dialog.getByRole("button", { name: "Delete workshop", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.locator("#workshop-alpha")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Edit Bravo", exact: true })).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls.map((call) => call.name))).toEqual([
		"deleteWorkshop",
		"deleteWorkshop",
	]);
});

test("reorder failure preserves the staged order and Reset clears the error for the next move", async ({
	page,
}) => {
	await mountWorkshops(page);
	await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
	await page.getByRole("button", { name: "Save order", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.getByRole("listitem").first()).toHaveAttribute("id", "workshop-bravo");
	await page.getByRole("button", { name: "Reset", exact: true }).click();
	await expect(page.getByRole("listitem").first()).toHaveAttribute("id", "workshop-alpha");
	await page.getByRole("button", { name: "Move Alpha down", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(page.getByText("Workshop order changed", { exact: true })).toBeVisible();
});

test("a pending edit locks list changes and fresh typing clears its Saved state", async ({
	page,
}) => {
	await mountWorkshops(page);
	const row = page.locator("#workshop-alpha");
	await row.getByRole("button", { name: "Edit Alpha", exact: true }).click();
	const title = row.getByRole("textbox", { name: "Title *", exact: true });
	await title.fill("Updated Alpha");
	await outcome(page, "pending");
	await title.press("Enter");
	await expect(title).toBeDisabled();
	await expect(page.getByRole("button", { name: "Add workshop", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Move Bravo up", exact: true })).toBeDisabled();
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(row.getByText("Saved", { exact: true })).toBeVisible();
	await expect(title).toBeEnabled();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await title.fill("Another draft");
	await expect(row.getByText("Saved", { exact: true })).toHaveCount(0);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
});

test("a creation response does not duplicate a row already delivered by refresh", async ({
	page,
}) => {
	await mountWorkshops(page);
	const form = await openCreate(page);
	await outcome(page, "pending");
	await form.getByRole("button", { name: "Add workshop", exact: true }).click();
	await page.evaluate(
		(rows) => window.mountWorkshops(rows),
		[
			...workshops,
			{ slug: "created-piece", title: "Gond painting", blurb: "Paint a motif.", order: 4 },
		],
	);
	await expect(page.locator("#workshop-created-piece")).toHaveCount(1);
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(form).toHaveCount(0);
	await expect(page.locator("#workshop-created-piece")).toHaveCount(1);
	await expect(page.getByRole("heading", { name: "All workshops (4)" })).toBeVisible();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

test("deleting the only row restores focus to the open create draft", async ({ page }) => {
	await mountWorkshops(page, [workshops[0]!]);
	const form = await openCreate(page);
	await page.getByRole("button", { name: "Delete Alpha", exact: true }).click();
	await outcome(page, "success");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Delete workshop", exact: true })
		.click();
	const title = form.getByRole("textbox", { name: "Title *", exact: true });
	await expect(page.locator("#workshop-alpha")).toHaveCount(0);
	await expect(title).toHaveValue("Gond painting");
	await expect(title).toBeFocused();
});

test("refresh updates a pristine open editor without creating a false unsaved draft", async ({
	page,
}) => {
	await mountWorkshops(page);
	const row = page.locator("#workshop-alpha");
	await row.getByRole("button", { name: "Edit Alpha", exact: true }).click();
	await page.evaluate(
		(rows) => window.mountWorkshops(rows),
		workshops.map((workshop) =>
			workshop.slug === "alpha" ? { ...workshop, durationHours: 1.25 } : workshop,
		),
	);
	await expect(row.getByRole("textbox", { name: "Duration (hours) (optional)" })).toHaveValue(
		"1.25",
	);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});
