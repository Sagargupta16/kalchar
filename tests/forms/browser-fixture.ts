import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import { build } from "esbuild";

// Local form fixture: saves are recorded in memory and never reach the application server.

interface FormOptions {
	availableStyles?: string[];
	sizes?: string[];
	budgets?: string[];
	timelines?: string[];
}

declare global {
	interface Window {
		customOrderTest: {
			submissions: Record<string, FormDataEntryValue>[];
			outcome: "saved" | "failed" | "pending";
			release?: () => void;
		};
		mountCustomOrder: (options?: FormOptions) => void;
		leaveCustomOrder: () => void;
	}
}

let bundle: Promise<string> | undefined;

function formBundle(): Promise<string> {
	bundle ??= build({
		stdin: {
			contents: `
				import { createRoot } from "react-dom/client";
				import { CustomOrderForm } from "@/components/forms/custom-order-form";

				const root = createRoot(document.getElementById("fixture"));
				window.customOrderTest = { submissions: [], outcome: "saved" };
				window.leaveCustomOrder = () => root.render(<p>Looking at the gallery</p>);
				window.mountCustomOrder = (options = {}) => root.render(
					<CustomOrderForm
						phoneE164NoPlus="919999999999"
						emailUrl="mailto:studio@example.invalid"
						availableStyles={["Madhubani", "Warli / custom style"]}
						styleSamples={{}}
						sizes={["Small", "Medium"]}
						budgets={["Under 5,000", "Open / not sure"]}
						timelines={["No hurry", "Within a month"]}
						submitLabel="Send on WhatsApp"
						fallbackEmailLabel="Or email instead"
						{...options}
					/>
				);
			`,
			loader: "tsx",
			resolveDir: resolve("."),
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
				name: "custom-order-fake-save",
				setup(builder) {
					builder.onResolve({ filter: /\/lead-actions$/ }, () => ({
						path: "lead-actions",
						namespace: "custom-order-fixture",
					}));
					builder.onLoad({ filter: /.*/, namespace: "custom-order-fixture" }, () => ({
						contents: `
							export async function submitLead(formData) {
								const state = window.customOrderTest;
								state.submissions.push(Object.fromEntries(formData));
								if (state.outcome === "pending") {
									return new Promise(resolve => {
										state.release = () => resolve({ ok: true });
									});
								}
								return { ok: state.outcome === "saved" };
							}
						`,
					}));
				},
			},
		],
	}).then((result) => result.outputFiles[0]!.text);
	return bundle;
}

export async function mountCustomOrder(page: Page, options: FormOptions = {}) {
	await page.route("http://custom-order.test/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<html><head><title>Custom order form checks</title><style>
				.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
				label { display: block; }
				svg { width: 16px; height: 16px; }
			</style></head><body><main id="fixture"></main></body></html>`,
		}),
	);
	await page.goto("http://custom-order.test/custom-orders");
	await page.addScriptTag({ content: await formBundle() });
	await page.evaluate((props) => window.mountCustomOrder(props), options);
}

export async function returnToCustomOrder(page: Page, options: FormOptions = {}) {
	await page.evaluate(() => window.leaveCustomOrder());
	await page.getByText("Looking at the gallery").waitFor();
	await page.evaluate((props) => window.mountCustomOrder(props), options);
}
