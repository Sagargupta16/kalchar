import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";
import type { Testimonial } from "../../lib/types";
import type { actionState, navigate } from "../admin/mock-actions";

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		mountTestimonials: (testimonials: Testimonial[]) => void;
	}
}

const testimonials: Testimonial[] = [
	{ id: "mira", quote: "Beautiful work.", authorName: "Mira", featured: false, order: 1 },
	{ id: "ravi", quote: "A thoughtful workshop.", authorName: "Ravi", featured: false, order: 2 },
];
const createdTestimonial: Testimonial = {
	id: "created-event",
	quote: "A treasured piece.",
	authorName: "Priya",
	authorLocation: "Pune",
	artworkSlug: "alpha",
	featured: true,
	order: 3,
};

let bundle: Promise<string> | undefined;

// Page-owned refresh probes reuse the existing action mock without changing
// the shared fixture. The bundle is in memory and never contacts Next or storage.
async function mountTestimonials(page: Page, initial = testimonials) {
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode } from "react";
				import { createRoot } from "react-dom/client";
				import { TestimonialsManager } from "./app/admin/_components/testimonials-manager";
				import { AdminDraftProvider } from "./app/admin/_components/admin-draft-guard";
				import { ConfirmProvider } from "./app/admin/_components/confirm-dialog";
				import { actionState, navigate } from "./tests/admin/mock-actions";
				window.adminTest = Object.assign(actionState, { navigate });
				const artworks = [{ slug: "alpha", title: "Alpha", image: "alpha.jpg" }];
				const root = createRoot(document.getElementById("fixture"));
				window.mountTestimonials = (testimonials) => root.render(
					<StrictMode><ConfirmProvider><AdminDraftProvider>
						<TestimonialsManager testimonials={testimonials} artworks={artworks} />
					</AdminDraftProvider></ConfirmProvider></StrictMode>
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
		define: {
			"process.env.NODE_ENV": JSON.stringify("development"),
			"process.env.NEXT_PUBLIC_IMAGE_BASE_URL": JSON.stringify("https://images.example.invalid"),
		},
		alias: { "@": resolve(".") },
		logLevel: "silent",
		plugins: [
			{
				name: "isolated-testimonial-actions",
				setup(builder) {
					builder.onResolve({ filter: /(^next\/navigation$|\/testimonial-actions$)/ }, () => ({
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
		<html><head><title>Testimonial component checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate((rows) => window.mountTestimonials(rows), initial);
}

async function outcome(page: Page, value: Window["adminTest"]["outcome"]) {
	await page.evaluate((next) => {
		window.adminTest.outcome = next;
	}, value);
}

async function hasUnsavedWarning(page: Page) {
	return page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});
}

async function openCreate(page: Page) {
	await page.getByRole("button", { name: "Add testimonial", exact: true }).first().click();
	const form = page.getByRole("form", { name: "Add a testimonial", exact: true });
	await form.getByLabel("Quote *", { exact: true }).fill("A treasured piece.");
	await form.getByLabel("Author name *", { exact: true }).fill("Priya");
	return form;
}

for (const field of ["Quote *", "Author name *"]) {
	test(`whitespace in ${field} is rejected before a create request`, async ({ page }) => {
		await mountTestimonials(page);
		const form = await openCreate(page);
		const input = form.getByLabel(field, { exact: true });
		await input.fill("   ");
		await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
		await expect(input).toBeFocused();
		expect(await input.evaluate((node: HTMLInputElement) => node.validationMessage)).not.toBe("");
		await input.fill(field === "Quote *" ? "A treasured piece." : "Priya");
		await outcome(page, "success");
		await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
		await expect(form).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
	});
}

test("draft cancellation offers Keep editing, warns on reload, and restores focus after discard", async ({
	page,
}) => {
	await mountTestimonials(page);
	const form = await openCreate(page);
	await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
	await form.getByRole("button", { name: "Cancel", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Discard testimonial?" });
	await expect(dialog.getByRole("button", { name: "Keep editing", exact: true })).toBeFocused();
	await dialog.getByRole("button", { name: "Keep editing", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(form.getByLabel("Quote *", { exact: true })).toHaveValue("A treasured piece.");
	await form.getByRole("button", { name: "Cancel", exact: true }).click();
	await dialog.getByRole("button", { name: "Discard testimonial", exact: true }).click();
	await expect(form).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Add testimonial", exact: true })).toBeFocused();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
});

test("a fresh create form has no error from a discarded request", async ({ page }) => {
	await mountTestimonials(page);
	const form = await openCreate(page);
	await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
	await expect(form.getByRole("alert")).toHaveText("Change was rejected.");
	await form.getByRole("button", { name: "Cancel", exact: true }).click();
	await page.getByRole("button", { name: "Discard testimonial", exact: true }).click();
	await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
	await expect(form.getByRole("alert")).toHaveCount(0);
	await expect(form.getByLabel("Quote *", { exact: true })).toHaveValue("");
	await expect(form.getByLabel("Quote *", { exact: true })).toBeFocused();
});

test("a pristine create form closes without a discard prompt", async ({ page }) => {
	await mountTestimonials(page);
	await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await page.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Add testimonial", exact: true })).toBeFocused();
});

for (const control of ["artwork", "featured"] as const) {
	test(`a ${control}-only draft is protected until the choice is cleared`, async ({ page }) => {
		await mountTestimonials(page);
		await page.getByRole("button", { name: "Add testimonial", exact: true }).click();
		const form = page.getByRole("form", { name: "Add a testimonial", exact: true });
		const change = (selected: boolean) =>
			control === "artwork"
				? form
						.getByLabel("Link to an artwork (optional)", { exact: true })
						.selectOption(selected ? "alpha" : "")
				: form.getByRole("switch", { name: "Feature on home page" }).click();
		await change(true);
		await expect.poll(() => hasUnsavedWarning(page)).toBe(true);
		await change(false);
		await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
		await form.getByRole("button", { name: "Cancel", exact: true }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(form).toHaveCount(0);
	});
}

test("creation is visible immediately and a later refresh cannot duplicate it", async ({
	page,
}) => {
	await mountTestimonials(page);
	const form = await openCreate(page);
	await form.getByLabel("Location (optional)", { exact: true }).fill("Pune");
	await form.getByLabel("Link to an artwork (optional)", { exact: true }).selectOption("alpha");
	await form.getByRole("switch", { name: "Feature on home page" }).click();
	await outcome(page, "success");
	await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
	const row = page.locator("#testimonial-created-event");
	await expect(row).toContainText("A treasured piece.");
	await expect(row).toContainText("Priya, Pune, on Alpha");
	await expect(row).toBeFocused();
	await expect(page.getByRole("heading", { name: "All testimonials (3)" })).toBeVisible();
	await expect(page.getByRole("link", { name: "View on site" })).toHaveAttribute("href", "/");
	await expect.poll(() => hasUnsavedWarning(page)).toBe(false);
	await page.evaluate(
		(rows) => window.mountTestimonials(rows),
		[createdTestimonial, ...testimonials],
	);
	await expect(row).toHaveCount(1);
	await expect(page.getByRole("heading", { name: "All testimonials (3)" })).toBeVisible();
});

test("a new unplaced quote stays admin only without a misleading public link", async ({ page }) => {
	await mountTestimonials(page, []);
	const form = await openCreate(page);
	await outcome(page, "success");
	await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
	await expect(page.locator("#testimonial-created-event")).toContainText("Admin only");
	await expect(page.getByRole("link", { name: "View on site" })).toHaveCount(0);
	await expect(page.getByRole("status")).toContainText("It is not shown in public yet");
	await expect(page.getByRole("heading", { name: "All testimonials (1)" })).toBeVisible();
});

test("a refresh arriving before the create response does not duplicate the new quote", async ({
	page,
}) => {
	await mountTestimonials(page);
	const form = await openCreate(page);
	await outcome(page, "pending");
	await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
	await page.evaluate(
		(rows) => window.mountTestimonials(rows),
		[createdTestimonial, ...testimonials],
	);
	await expect(page.locator("#testimonial-created-event")).toHaveCount(1);
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(form).toHaveCount(0);
	await expect(page.locator("#testimonial-created-event")).toHaveCount(1);
	await expect(page.getByRole("heading", { name: "All testimonials (3)" })).toBeVisible();
});

for (const failure of ["failure", "throw"] as const) {
	const message = failure === "failure" ? "Change was rejected." : "Connection interrupted.";
	test(`pending create freezes the draft and keeps it on ${failure}`, async ({ page }) => {
		await mountTestimonials(page);
		const form = await openCreate(page);
		await form.getByLabel("Location (optional)", { exact: true }).fill("Pune");
		await form.getByLabel("Link to an artwork (optional)", { exact: true }).selectOption("alpha");
		await form.getByRole("switch", { name: "Feature on home page" }).click();
		await outcome(page, "pending");
		await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
		await expect(form.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
		await expect(form.getByLabel("Quote *", { exact: true })).toBeDisabled();
		await expect(form.getByRole("switch", { name: "Feature on home page" })).toBeDisabled();
		await form.evaluate((node: HTMLFormElement) => node.requestSubmit());
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(1);
		await outcome(page, failure);
		await page.evaluate(() => window.adminTest.release?.());
		await expect(form.getByRole("alert")).toHaveText(message);
		await expect(form.getByLabel("Quote *", { exact: true })).toHaveValue("A treasured piece.");
		await expect(form.getByLabel("Location (optional)", { exact: true })).toHaveValue("Pune");
		await expect(form.getByLabel("Link to an artwork (optional)", { exact: true })).toHaveValue(
			"alpha",
		);
		await expect(form.getByRole("switch", { name: "Feature on home page" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await outcome(page, "success");
		await form.getByRole("button", { name: "Add testimonial", exact: true }).click();
		await expect(form).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(2);
	});
}

test("Undo restores the featured state before refresh and blocks competing row actions", async ({
	page,
}) => {
	await mountTestimonials(page);
	const feature = page.getByRole("button", {
		name: "Feature testimonial from Mira on the home page",
	});
	await outcome(page, "success");
	await feature.click();
	await expect(feature).toHaveAttribute("aria-pressed", "true");
	await outcome(page, "pending");
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toBeDisabled();
	await expect(feature).toBeDisabled();
	await expect(page.getByRole("button", { name: "Delete testimonial from Mira" })).toBeDisabled();
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(feature).toHaveAttribute("aria-pressed", "false");
	await expect(page.locator("#testimonial-mira")).toContainText("Admin only");
	await expect(page.locator("#testimonial-mira")).toBeFocused();
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
	expect((await page.evaluate(() => window.adminTest.calls)).map((call) => call.args)).toEqual([
		["mira", true],
		["mira", false],
	]);
});

test("a failed Undo retains the saved feature state and can be retried", async ({ page }) => {
	await mountTestimonials(page);
	const feature = page.getByRole("button", {
		name: "Feature testimonial from Mira on the home page",
	});
	await outcome(page, "success");
	await feature.click();
	await outcome(page, "failure");
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(page.getByRole("status").getByRole("alert")).toBeVisible();
	await expect(feature).toHaveAttribute("aria-pressed", "true");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(feature).toHaveAttribute("aria-pressed", "false");
});

test("unfeaturing a linked quote keeps its artwork placement", async ({ page }) => {
	await mountTestimonials(page, [{ ...testimonials[0]!, featured: true, artworkSlug: "alpha" }]);
	await outcome(page, "success");
	const feature = page.getByRole("button", {
		name: "Feature testimonial from Mira on the home page",
	});
	await feature.click();
	await expect(feature).toHaveAttribute("aria-pressed", "false");
	await expect(
		page.locator("#testimonial-mira").getByText("On Alpha", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("Admin only", { exact: true })).toHaveCount(0);
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(feature).toHaveAttribute("aria-pressed", "true");
});

test("pending deletion stays in its dialog and a failure allows retry", async ({ page }) => {
	await mountTestimonials(page);
	await page.getByRole("button", { name: "Delete testimonial from Mira" }).click();
	const dialog = page.getByRole("dialog", { name: "Delete testimonial from Mira?" });
	await expect(dialog.getByRole("button", { name: "Keep testimonial" })).toBeFocused();
	await outcome(page, "pending");
	await dialog.getByRole("button", { name: "Delete testimonial", exact: true }).click();
	await expect(
		dialog.getByRole("button", { name: "Delete testimonial", exact: true }),
	).toBeDisabled();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeVisible();
	await expect(page.locator("#testimonial-mira")).toBeAttached();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(
		dialog.getByRole("button", { name: "Delete testimonial", exact: true }),
	).toBeEnabled();
	await outcome(page, "success");
	await dialog.getByRole("button", { name: "Delete testimonial", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.locator("#testimonial-mira")).toHaveCount(0);
	await expect(page.locator("#testimonial-ravi")).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(1);
});

test("deleting a featured quote clears its stale Undo offer", async ({ page }) => {
	await mountTestimonials(page, [testimonials[0]!]);
	await outcome(page, "success");
	await page
		.getByRole("button", { name: "Feature testimonial from Mira on the home page" })
		.click();
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Delete testimonial from Mira" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Delete testimonial", exact: true })
		.click();
	await expect(page.locator("#testimonial-mira")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Add testimonial", exact: true }).first(),
	).toBeFocused();
});

test("deleting another quote preserves the available Undo", async ({ page }) => {
	await mountTestimonials(page);
	await outcome(page, "success");
	await page
		.getByRole("button", { name: "Feature testimonial from Mira on the home page" })
		.click();
	await page.getByRole("button", { name: "Delete testimonial from Ravi" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Delete testimonial", exact: true })
		.click();
	await expect(page.locator("#testimonial-ravi")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Feature testimonial from Mira on the home page" }),
	).toHaveAttribute("aria-pressed", "false");
});

test("deleting the last row returns focus to an open create draft", async ({ page }) => {
	await mountTestimonials(page, [testimonials[0]!]);
	const form = await openCreate(page);
	await outcome(page, "success");
	await page.getByRole("button", { name: "Delete testimonial from Mira" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Delete testimonial", exact: true })
		.click();
	await expect(page.locator("#testimonial-mira")).toHaveCount(0);
	await expect(form.getByLabel("Quote *", { exact: true })).toBeFocused();
	await expect(form.getByLabel("Quote *", { exact: true })).toHaveValue("A treasured piece.");
});

test("keyboard cancellation of deletion returns to its trigger without a request", async ({
	page,
}) => {
	await mountTestimonials(page);
	const trigger = page.getByRole("button", { name: "Delete testimonial from Mira" });
	await trigger.focus();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("button", { name: "Keep testimonial" })).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(trigger).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});
