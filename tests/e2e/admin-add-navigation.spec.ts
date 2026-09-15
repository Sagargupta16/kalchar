import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";
import { outcome } from "../admin/browser-fixture";
import type { actionState, navigate } from "../admin/mock-actions";

type Navigation = "desktop" | "mobile";

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		mountAddNavigation: (options: { pathname: string; navigation: Navigation }) => void;
	}
}

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/WQAAAAASUVORK5CYII=",
	"base64",
);
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: png });
let bundle: Promise<string> | undefined;

async function mountAddNavigation(
	page: Page,
	pathname = "/admin/categories",
	navigation: Navigation = "desktop",
) {
	// Keep the real shell and routed forms together. Only navigation and the
	// external action/storage boundaries use the existing shared mocks.
	bundle ??= build({
		stdin: {
			contents: `
				import { StrictMode, useEffect } from "react";
				import { createRoot } from "react-dom/client";
				import Link from "next/link";
				import { usePathname } from "next/navigation";
				import { AddSheetProvider } from "./app/admin/_components/add-sheet";
				import { AdminDraftProvider } from "./app/admin/_components/admin-draft-guard";
				import { AdminNavDesktop, AdminNavMobile } from "./app/admin/_components/admin-nav";
				import { CategoryManager } from "./app/admin/_components/category-manager";
				import { EventsManager } from "./app/admin/_components/events-manager";
				import { ConfirmProvider } from "./app/admin/_components/confirm-dialog";
				import { actionState, navigate } from "./tests/admin/mock-actions";
				window.adminTest = Object.assign(actionState, { navigate });
				function CurrentPage() {
					const pathname = usePathname();
					useEffect(() => {
						window.history.replaceState(null, "", pathname);
					}, [pathname]);
					if (pathname.replace(/\\/$/, "") === "/admin/events") {
						return <EventsManager events={[]} />;
					}
					if (pathname.replace(/\\/$/, "") === "/admin/categories") {
						return <CategoryManager categories={[{ id: "gond", name: "Gond", order: 0 }]} usage={{}} />;
					}
					return <h1>{pathname === "/admin/workshops" ? "Workshops" : "Testimonials"}</h1>;
				}
				const root = createRoot(document.getElementById("fixture"));
				window.mountAddNavigation = ({ pathname, navigation }) => {
					navigate(pathname);
					root.render(
						<StrictMode><ConfirmProvider><AdminDraftProvider>
							<AddSheetProvider categories={["Gond"]}>
								{navigation === "desktop" ? <AdminNavDesktop /> : <AdminNavMobile email="artist@example.invalid" />}
								<Link href="/admin/events">Events page</Link>
								<section aria-label="Current admin page"><CurrentPage /></section>
							</AddSheetProvider>
						</AdminDraftProvider></ConfirmProvider></StrictMode>
					);
				};
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
				name: "isolated-add-actions",
				setup(builder) {
					builder.onResolve(
						{
							filter:
								/(^next\/navigation$|\/(artwork-actions|actions|event-actions|lead-actions|testimonial-actions)$|^\.\/stage-image$)/,
						},
						() => ({ path: resolve("tests/admin/mock-actions.ts") }),
					);
					builder.onResolve({ filter: /^next\/link$/ }, () => ({
						path: resolve("tests/admin/mock-link.tsx"),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	await page.route("**/*", (route) =>
		route.request().url().startsWith("http://admin-add.test/")
			? route.fulfill({ contentType: "text/html", body: "<html><body></body></html>" })
			: route.abort(),
	);
	await page.goto(`http://admin-add.test${pathname}`);
	await page.setContent(`
		<html><head><title>Add navigation checks</title><style>
		body { font-family: sans-serif; }
		dialog { border: 0; padding: 16px; }
		dialog[open] { display: grid; place-items: center; }
		dialog > div { position: relative; z-index: 10; background: white; padding: 16px; }
		dialog > button { position: absolute; inset: 0; border: 0; background: transparent; }
		.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
		</style></head><body><main id="fixture"></main></body></html>
	`);
	await page.addScriptTag({ content: await bundle });
	await page.evaluate((options) => window.mountAddNavigation(options), { pathname, navigation });
}

const eventForm = (page: Page) =>
	page.getByRole("form", { name: "Add an event", exact: true });
const leaveDialog = (page: Page) =>
	page.getByRole("dialog", { name: "Leave without saving?", exact: true });

async function chooseAddDestination(page: Page, label: string) {
	await page.getByRole("button", { name: "Add", exact: true }).click();
	await page.getByRole("dialog", { name: "Add", exact: true }).getByRole("button", {
		name: label,
		exact: true,
	}).click();
}

async function pickGlobalPhotos(
	page: Page,
	files: ReturnType<typeof photo>[],
	navigation: Navigation = "desktop",
) {
	const picker = page.waitForEvent("filechooser");
	const path = await page.evaluate(() => window.adminTest.pathname);
	if (path.replace(/\/$/, "") === "/admin/events") {
		await page.getByRole("navigation", { name: "Admin", exact: true }).getByRole("button", {
			name: navigation === "desktop" ? "Add event" : "Add an event",
			exact: true,
		}).click();
	} else {
		await chooseAddDestination(page, "Add event");
	}
	await (await picker).setFiles(files);
}

for (const navigation of ["desktop", "mobile"] as const) {
	test(`${navigation} Add confirms departure and keeps a cancelled category draft`, async ({
		page,
	}) => {
		await mountAddNavigation(page, "/admin/categories", navigation);
		const name = page.getByRole("textbox", { name: "Category name", exact: true });
		await name.fill("New tradition");
		await chooseAddDestination(page, "Add workshop");
		await expect(leaveDialog(page)).toBeVisible();
		await expect(page).toHaveURL("http://admin-add.test/admin/categories");
		await leaveDialog(page).getByRole("button", { name: "Keep editing" }).click();
		await expect(leaveDialog(page)).toHaveCount(0);
		await expect(name).toHaveValue("New tradition");
		await expect(page.getByRole("button", { name: "Add", exact: true })).toBeFocused();
		await chooseAddDestination(page, "Add workshop");
		await leaveDialog(page).getByRole("button", { name: "Leave page" }).click();
		await expect(page.getByRole("heading", { name: "Workshops", exact: true })).toBeVisible();
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
	});

	test(`${navigation} global event photos populate the current page once`, async ({ page }) => {
		await mountAddNavigation(page, "/admin/events/", navigation);
		await pickGlobalPhotos(page, [photo("cover.png"), photo("detail.png")], navigation);
		await expect(eventForm(page)).toBeVisible();
		await expect(eventForm(page).getByRole("img")).toHaveCount(2);
		await expect(eventForm(page).getByRole("img").first()).toHaveAttribute(
			"alt",
			"Selection 1: cover.png",
		);
		await expect(leaveDialog(page)).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
		expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual([]);
		await eventForm(page).getByRole("button", { name: "Cancel", exact: true }).click();
		const pageContent = page.getByRole("region", { name: "Current admin page" });
		await pageContent.getByRole("button", { name: "Add event", exact: true }).first().click();
		await expect(eventForm(page).getByRole("img")).toHaveCount(0);
	});

	test(`${navigation} global photos arrive after navigation without an automatic upload`, async ({
		page,
	}) => {
		await mountAddNavigation(page, "/admin/categories", navigation);
		await pickGlobalPhotos(page, [photo("arrival.png")], navigation);
		await expect(page).toHaveURL("http://admin-add.test/admin/events");
		await expect(eventForm(page).getByRole("img", {
			name: "Selection 1: arrival.png",
		})).toBeVisible();
		await expect(leaveDialog(page)).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
		expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual([]);
	});
}

test("cancelled event navigation retains the page draft and the picked photos", async ({ page }) => {
	await mountAddNavigation(page);
	const name = page.getByRole("textbox", { name: "Category name", exact: true });
	await name.fill("Keep this category");
	await pickGlobalPhotos(page, [photo("retained.png")]);
	await expect(leaveDialog(page)).toBeVisible();
	await leaveDialog(page).getByRole("button", { name: "Keep editing" }).click();
	await expect(name).toHaveValue("Keep this category");
	await expect(eventForm(page)).toHaveCount(0);
	await page.getByRole("link", { name: "Events page", exact: true }).click();
	await expect(leaveDialog(page)).toBeVisible();
	await leaveDialog(page).getByRole("button", { name: "Leave page" }).click();
	await expect(eventForm(page).getByRole("img", {
		name: "Selection 1: retained.png",
	})).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("another global selection preserves the open event details and photos", async ({ page }) => {
	await mountAddNavigation(page, "/admin/events");
	await pickGlobalPhotos(page, [photo("first.png")]);
	const title = eventForm(page).getByLabel("Title *", { exact: true });
	await title.fill("Draft exhibition");
	await eventForm(page).getByLabel("Description (optional)").fill("Keep these details.");
	await pickGlobalPhotos(page, [photo("second.png")]);
	await expect(title).toHaveValue("Draft exhibition");
	await expect(eventForm(page).getByLabel("Description (optional)")).toHaveValue(
		"Keep these details.",
	);
	await expect(eventForm(page).getByRole("img")).toHaveCount(2);
	await expect(eventForm(page).getByRole("img").last()).toHaveAttribute(
		"alt",
		"Selection 2: second.png",
	);
	await expect(leaveDialog(page)).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("invalid global photos use the event form validation before any action", async ({ page }) => {
	await mountAddNavigation(page, "/admin/events");
	await pickGlobalPhotos(page, [{ name: "notes.txt", mimeType: "text/plain", buffer: png }]);
	await expect(eventForm(page).getByRole("alert")).toContainText("JPG, PNG or WebP");
	await expect(
		eventForm(page).getByRole("button", { name: "Add event", exact: true }),
	).toBeDisabled();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("photos picked during a submission wait for a fresh event draft", async ({ page }) => {
	await mountAddNavigation(page, "/admin/events");
	await pickGlobalPhotos(page, [photo("submitted.png")]);
	await eventForm(page).getByLabel("Title *", { exact: true }).fill("First event");
	await outcome(page, "pending");
	await eventForm(page).getByRole("button", { name: "Add event", exact: true }).click();
	await expect(eventForm(page).getByLabel("Title *", { exact: true })).toBeDisabled();
	await pickGlobalPhotos(page, [photo("next-event.png")]);
	await expect(eventForm(page).getByRole("img")).toHaveCount(1);
	await expect(eventForm(page).getByRole("img").first()).toHaveAttribute(
		"alt",
		"Selection 1: submitted.png",
	);
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(eventForm(page).getByLabel("Title *", { exact: true })).toHaveValue("");
	await expect(eventForm(page).getByRole("img", {
		name: "Selection 1: next-event.png",
	})).toBeVisible();
	expect(await page.evaluate(() =>
		window.adminTest.calls.filter((call) => call.name === "processEventPhoto").length,
	)).toBe(1);
});
