import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";
import type { actionState, navigate } from "../admin/mock-actions";

interface Maintainer {
	email: string;
	name: string | null;
	isRoot: boolean;
	addedBy: string | null;
}

const roster: Maintainer[] = [
	{ email: "root@example.invalid", name: "Root", isRoot: true, addedBy: null },
	{ email: "bravo@example.invalid", name: null, isRoot: false, addedBy: "root@example.invalid" },
];

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		renderMaintainers: (items: Maintainer[], me: string) => void;
	}
}

let bundle: Promise<string> | undefined;

async function mountMaintainers(page: Page, items = roster, me = "root@example.invalid") {
	// This entry can refresh props without changing the shared fixture. All
	// actions and navigation resolve to mocks, with no server or credentials.
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode } from "react";
				import { createRoot } from "react-dom/client";
				import { MaintainerManager } from "./app/admin/_components/maintainer-manager";
				import { AdminDraftProvider } from "./app/admin/_components/admin-draft-guard";
				import { ConfirmProvider } from "./app/admin/_components/confirm-dialog";
				import { actionState, navigate } from "./tests/admin/mock-actions";
				window.adminTest = Object.assign(actionState, { navigate });
				const root = createRoot(document.getElementById("fixture"));
				window.renderMaintainers = (roster, me) => root.render(
					<StrictMode><ConfirmProvider><AdminDraftProvider>
						<MaintainerManager roster={roster} me={me} />
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
		define: { "process.env.NODE_ENV": JSON.stringify("development") },
		alias: { "@": resolve(".") },
		logLevel: "silent",
		plugins: [
			{
				name: "isolated-maintainer-actions",
				setup(builder) {
					builder.onResolve({ filter: /(^next\/navigation$|\/actions$)/ }, () => ({
						path: resolve("tests/admin/mock-actions.ts"),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	await page.setContent(`
		<html><head><title>Maintainer component checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate(({ items, me }) => window.renderMaintainers(items, me), { items, me });
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

test("maintainers: invalid email errors are inline, linked and focused without a request", async ({
	page,
}) => {
	await mountMaintainers(page);
	const email = page.getByRole("textbox", { name: "Google email", exact: true });
	for (const address of ["", "not-an-email", "person@"]) {
		await email.fill(address);
		await page.getByRole("button", { name: "Add maintainer", exact: true }).click();
		await expect(email).toHaveAttribute("aria-invalid", "true");
		await expect(email).toBeFocused();
		const error = page.getByRole("alert");
		await expect(error).toContainText(address ? "valid Google email" : "Enter a Google email");
		await expect(email).toHaveAccessibleDescription((await error.textContent())!);
	}
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
	await email.fill("new@example.invalid");
	await expect(email).not.toHaveAttribute("aria-invalid");
	await expect(page.getByRole("alert")).toHaveCount(0);
});

test("maintainers: duplicate checks normalize email and return keyboard focus", async ({
	page,
}) => {
	await mountMaintainers(page);
	const email = page.getByRole("textbox", { name: "Google email", exact: true });
	await email.fill(" BRAVO@EXAMPLE.INVALID ");
	await page.getByRole("button", { name: "Add maintainer", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("bravo@example.invalid already has access.");
	await expect(email).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

for (const failure of ["failure", "throw"] as const) {
	test(`maintainers: a pending add blocks repeat submissions and keeps the draft after ${failure}`, async ({
		page,
	}) => {
		await mountMaintainers(page);
		const form = page.getByRole("form", { name: "Add a maintainer" });
		const email = form.getByRole("textbox", { name: "Google email", exact: true });
		const name = form.getByRole("textbox", { name: "Name (optional)", exact: true });
		const add = form.getByRole("button", { name: "Add maintainer", exact: true });
		await email.fill("NEW@example.invalid");
		await name.fill(" New Person ");
		await outcome(page, "pending");
		await add.click();
		await expect(form).toHaveAttribute("aria-busy", "true");
		await expect(add).toHaveAttribute("aria-busy", "true");
		await expect(add.locator(".animate-spin")).toHaveCount(1);
		await expect(email).toBeDisabled();
		await expect(name).toBeDisabled();
		await expect(page.getByRole("button", { name: "Remove bravo@example.invalid" })).toBeDisabled();
		await form.evaluate((element: HTMLFormElement) => {
			element.requestSubmit();
			element.requestSubmit();
		});
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([
			{ name: "inviteMaintainer", args: ["new@example.invalid", "New Person"] },
		]);
		await outcome(page, failure);
		await page.evaluate(() => window.adminTest.release?.());
		await expect(form.getByRole("alert")).toHaveText(
			failure === "failure" ? "Change was rejected." : "Connection interrupted.",
		);
		await expect(email).toBeEnabled();
		await expect(email).toHaveValue("NEW@example.invalid");
		await expect(name).toHaveValue(" New Person ");
		await expect(add).not.toHaveAttribute("aria-busy");
		expect(await hasUnsavedWarning(page)).toBe(true);
	});
}

test("maintainers: a successful add updates the roster, clears the draft and restores focus", async ({
	page,
}) => {
	await mountMaintainers(page);
	const email = page.getByRole("textbox", { name: "Google email", exact: true });
	const name = page.getByRole("textbox", { name: "Name (optional)", exact: true });
	await email.fill(" NEW@example.invalid ");
	await name.fill(" New Person ");
	await outcome(page, "success");
	await name.press("Enter");
	await expect(
		page.getByRole("list", { name: "Current maintainers" }).getByRole("listitem"),
	).toHaveCount(3);
	await expect(page.getByRole("button", { name: "Remove new@example.invalid" })).toBeVisible();
	await expect(page.locator("output")).toContainText("new@example.invalid can now sign in");
	await expect(email).toHaveValue("");
	await expect(name).toHaveValue("");
	await expect(email).toBeFocused();
	expect(await hasUnsavedWarning(page)).toBe(false);
	await name.fill("Another person");
	await expect(page.locator("output")).toHaveCount(0);
	await email.fill("new@example.invalid");
	await page.getByRole("button", { name: "Add maintainer", exact: true }).click();
	await expect(page.getByRole("alert")).toHaveText("new@example.invalid already has access.");
	expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(1);
});

for (const failure of ["failure", "throw"] as const) {
	test(`maintainers: removal keeps pending and ${failure} inside confirmation before retry`, async ({
		page,
	}) => {
		await mountMaintainers(page);
		const email = page.getByRole("textbox", { name: "Google email", exact: true });
		const name = page.getByRole("textbox", { name: "Name (optional)", exact: true });
		await email.fill("draft@example.invalid");
		await name.fill("Draft Person");
		await page.getByRole("button", { name: "Remove bravo@example.invalid" }).click();
		const dialog = page.getByRole("dialog", { name: "Remove bravo@example.invalid?" });
		const remove = dialog.getByRole("button", { name: "Remove maintainer", exact: true });
		const keep = dialog.getByRole("button", { name: "Keep maintainer", exact: true });
		await expect(keep).toBeFocused();
		await outcome(page, "pending");
		await remove.click();
		await expect(remove).toHaveAttribute("aria-busy", "true");
		await expect(keep).toBeDisabled();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeVisible();
		await outcome(page, failure);
		await page.evaluate(() => window.adminTest.release?.());
		await expect(dialog.getByRole("alert")).toHaveText(
			failure === "failure" ? "Change was rejected." : "Connection interrupted.",
		);
		await expect(
			page.getByRole("form", { name: "Add a maintainer" }).getByRole("alert"),
		).toHaveCount(0);
		await expect(remove).toBeEnabled();
		await outcome(page, "success");
		await remove.click();
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Remove bravo@example.invalid" })).toHaveCount(0);
		await expect(page.getByRole("status")).toContainText(
			"bravo@example.invalid no longer has access.",
		);
		await expect(email).toBeFocused();
		await expect(email).toHaveValue("draft@example.invalid");
		await expect(name).toHaveValue("Draft Person");
		expect(await hasUnsavedWarning(page)).toBe(true);
		expect(await page.evaluate(() => window.adminTest.calls.map((call) => call.name))).toEqual([
			"revokeMaintainer",
			"revokeMaintainer",
		]);
	});
}

test("maintainers: self-removal is case insensitive and root access has no remove control", async ({
	page,
}) => {
	await mountMaintainers(page, roster, " BRAVO@EXAMPLE.INVALID ");
	await expect(page.getByRole("button", { name: "Remove root@example.invalid" })).toHaveCount(0);
	const row = page.getByRole("listitem").filter({ hasText: "bravo@example.invalid" });
	await expect(row.getByText("(you)", { exact: true })).toBeVisible();
	const remove = row.getByRole("button", { name: "Remove bravo@example.invalid" });
	await remove.click();
	const dialog = page.getByRole("dialog", { name: "Remove your own access?" });
	await expect(dialog.getByRole("button", { name: "Keep my access" })).toBeFocused();
	await expect(dialog.getByRole("button", { name: "Remove my access" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(remove).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("maintainers: removing a middle row moves focus to the next removable maintainer", async ({
	page,
}) => {
	await mountMaintainers(page, [
		...roster,
		{ email: "charlie@example.invalid", name: "Charlie", isRoot: false, addedBy: null },
	]);
	await outcome(page, "success");
	await page.getByRole("button", { name: "Remove bravo@example.invalid" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Remove maintainer", exact: true })
		.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Remove charlie@example.invalid" })).toBeFocused();
});

test("maintainers: blank names fall back to email and the roster has its own label", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await mountMaintainers(page, [roster[0]!, { ...roster[1]!, name: "   " }]);
	const list = page.getByRole("list", { name: "Current maintainers" });
	await expect(
		page.getByRole("heading", { name: "Current maintainers", exact: true }),
	).toBeVisible();
	await expect(
		list.getByRole("listitem").nth(1).getByText("bravo@example.invalid", { exact: true }),
	).toBeVisible();
	await expect(list.getByText("Added by root@example.invalid", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Remove bravo@example.invalid" }).click();
	await expect(page.getByRole("dialog", { name: "Remove bravo@example.invalid?" })).toBeVisible();
});

test("maintainers: refreshing the roster retains draft values and reload protection", async ({
	page,
}) => {
	await mountMaintainers(page);
	const name = page.getByRole("textbox", { name: "Name (optional)", exact: true });
	expect(await hasUnsavedWarning(page)).toBe(false);
	await name.fill("   ");
	expect(await hasUnsavedWarning(page)).toBe(false);
	await name.fill("Draft Person");
	expect(await hasUnsavedWarning(page)).toBe(true);
	await page.evaluate(
		(next) => window.renderMaintainers(next, "root@example.invalid"),
		[...roster, { email: "new@example.invalid", name: null, isRoot: false, addedBy: null }],
	);
	await expect(page.getByRole("button", { name: "Remove new@example.invalid" })).toBeVisible();
	await expect(name).toHaveValue("Draft Person");
	expect(await hasUnsavedWarning(page)).toBe(true);
	await name.fill("");
	expect(await hasUnsavedWarning(page)).toBe(false);
});
