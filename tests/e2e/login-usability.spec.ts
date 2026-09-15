import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { build } from "esbuild";

// Authentication is mocked; this verifies the sign-in page without contacting Google.

interface LoginParams {
	callbackUrl?: string;
	error?: string;
}

declare global {
	interface Window {
		loginTest: {
			attempts: { provider: string; redirectTo: string }[];
			release?: () => void;
		};
		renderLogin: (params: LoginParams) => Promise<void>;
	}
}

let bundle: Promise<string> | undefined;

function loginBundle(): Promise<string> {
	bundle ??= build({
		stdin: {
			contents: `
				import { createRoot } from "react-dom/client";
				import LoginPage from "@/app/login/page";

				const root = createRoot(document.getElementById("fixture"));
				window.loginTest = { attempts: [] };
				window.renderLogin = async (params) => {
					root.render(await LoginPage({ searchParams: Promise.resolve(params) }));
				};
			`,
			loader: "tsx",
			resolveDir: resolve("."),
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
				name: "login-without-authentication",
				setup(builder) {
					const mocks: Record<string, string> = {
						"@/auth": `
							export async function signIn(provider, { redirectTo }) {
								window.loginTest.attempts.push({ provider, redirectTo });
								await new Promise(resolve => { window.loginTest.release = resolve; });
							}
						`,
						"@/lib/admin-auth": `
							export async function getAdminAccess() {
								return { email: null, allowed: false };
							}
						`,
						"@/lib/data": `
							export function getSite() {
								return { brand: { headline: { latinPrefix: "Kal", devanagariCore: "चर" } } };
							}
						`,
						"next/link": `
							export default function Link(props) { return <a {...props} />; }
						`,
						"next/navigation": `
							export function redirect() { throw new Error("Unexpected redirect in signed-out fixture"); }
						`,
					};
					builder.onResolve({ filter: /.*/ }, ({ path }) =>
						mocks[path] ? { path, namespace: "login-fixture" } : undefined,
					);
					builder.onLoad({ filter: /.*/, namespace: "login-fixture" }, ({ path }) => ({
						contents: mocks[path],
						loader: "tsx",
						resolveDir: resolve("."),
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	return bundle;
}

async function mountLogin(page: Page, params: LoginParams = {}) {
	await page.route("http://login.test/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<html lang="en"><head><title>Login checks</title><style>
				.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
				svg { width: 16px; height: 16px; }
			</style></head><body><div id="fixture"></div></body></html>`,
		}),
	);
	await page.goto("http://login.test/login");
	await page.addScriptTag({ content: await loginBundle() });
	await page.evaluate((query) => window.renderLogin(query), params);
}

test("sign-in announces progress, prevents repeat activation, and permits retry when idle", async ({
	page,
}) => {
	await mountLogin(page, { callbackUrl: "/admin/leads?page=2" });
	const button = page.getByRole("button", { name: "Continue with Google", exact: true });
	await button.focus();
	await page.keyboard.press("Enter");

	const pendingButton = page.getByRole("button", { name: "Connecting to Google", exact: true });
	await expect(pendingButton).toBeDisabled();
	await expect(page.getByRole("status")).toHaveText("Connecting to Google. Please wait.");
	await pendingButton.evaluate((element: HTMLButtonElement) => element.click());
	expect(await page.evaluate(() => window.loginTest.attempts)).toEqual([
		{ provider: "google", redirectTo: "/admin/leads?page=2" },
	]);

	await page.evaluate(() => window.loginTest.release?.());
	await expect(button).toBeEnabled();
	await expect(page.getByRole("status")).toBeEmpty();
	await button.focus();
	await page.keyboard.press("Space");
	await expect(pendingButton).toBeDisabled();
	expect(await page.evaluate(() => window.loginTest.attempts)).toHaveLength(2);
	await page.evaluate(() => window.loginTest.release?.());
	await expect(button).toBeEnabled();
});

for (const [error, message] of [
	["AccessDenied", "This account does not have access."],
	["OAuthCallbackError", "We couldn't complete sign-in."],
	["unknown", "We couldn't complete sign-in."],
] as const) {
	test(`${error} explains recovery and keeps the sign-in and public-site actions available`, async ({
		page,
	}) => {
		await mountLogin(page, { error });
		await expect(page.getByRole("alert")).toContainText(message);
		await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
		await expect(page.getByRole("link", { name: "Back to site" })).toHaveAttribute("href", "/");
	});
}

test("the ordinary sign-in state gives visitors a public route without an error", async ({
	page,
}) => {
	await mountLogin(page);
	await expect(page.getByRole("heading", { name: "Maintainer sign-in" })).toBeVisible();
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(page.getByText(/without signing in/)).toBeVisible();
	await expect(page.getByRole("link", { name: "Back to site" })).toHaveAttribute("href", "/");
});
