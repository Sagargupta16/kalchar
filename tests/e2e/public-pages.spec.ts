import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, type Route, test } from "@playwright/test";
import { settleAnimations } from "./helpers/animation-settle";

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({ body: MEDIA_FIXTURE, contentType: "image/jpeg" }),
	);
});

async function expectTouchTarget(locator: Locator) {
	const box = await locator.boundingBox();
	expect(box?.width).toBeGreaterThanOrEqual(44);
	expect(box?.height).toBeGreaterThanOrEqual(44);
}

async function tapMenuTrigger(page: Page, trigger: Locator) {
	// A viewport tap avoids locator scrolling that would move the form before opening the menu.
	await expect(trigger).toBeInViewport();
	const box = await trigger.boundingBox();
	if (!box) throw new Error("The visible menu trigger has no bounds");
	await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function useTheme(page: Page, theme: "light" | "dark") {
	await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
}

/** The one global focus treatment (D12): a solid 2px outline, no ring. */
async function expectFocusOutline(locator: Locator) {
	await expect(locator).toBeFocused();
	await expect(locator).toHaveCSS("outline-style", "solid");
	await expect(locator).toHaveCSS("outline-width", "2px");
	await expect(locator).toHaveCSS("outline-offset", "2px");
}

async function expectModalFocus(page: Page, trigger: Locator, lastControl: Locator) {
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
	await settleAnimations(page, "dialog[open]");
	const accessibility = await new AxeBuilder({ page })
		.include("dialog[open]")
		.withTags(AXE_TAGS)
		.analyze();
	expect(accessibility.violations).toEqual([]);
	await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
	await page.keyboard.press("Shift+Tab");
	await expect(lastControl).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();

	// Modal background isolation also prevents programmatic focus escaping.
	await trigger.evaluate((element) => (element as HTMLElement).focus());
	expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
}

test("@mobile navigation retains a brief and scroll across closing and route changes", async ({
	page,
}) => {
	await useTheme(page, "light");
	await page.goto("/custom-orders/");
	const brief = page.getByLabel("What would you like painted?");
	await brief.fill("A lotus pond for our hallway");
	await page.getByLabel("Your name").fill("A visitor");
	await page.getByLabel("Email or WhatsApp number").fill("visitor@example.invalid");
	const originalScroll = await page.evaluate(() => scrollY);
	expect(originalScroll).toBeGreaterThan(0);
	const trigger = page.getByRole("button", { name: "Open menu", exact: true });
	const menu = page.getByRole("dialog", { name: "Site navigation" });
	const destinations = menu.getByRole("navigation", { name: "Primary mobile" });

	await tapMenuTrigger(page, trigger);
	await expect(destinations).toBeVisible();
	expect(await menu.evaluate((element) => element.matches(":modal"))).toBe(true);
	await menu.getByRole("button", { name: "Switch to dark theme" }).click();
	await expect(page.locator("html")).toHaveClass(/dark/);
	await page.keyboard.press("Escape");
	await expect(menu).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalScroll);
	await expect(brief).toHaveValue("A lotus pond for our hallway");

	await tapMenuTrigger(page, trigger);
	await destinations.getByRole("link", { name: "Custom Orders", exact: true }).click();
	await expect(menu).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalScroll);
	await expect(brief).toHaveValue("A lotus pond for our hallway");

	await tapMenuTrigger(page, trigger);
	await destinations.getByRole("link", { name: "Contact", exact: true }).click();
	await expect(page).toHaveURL(/\/contact\/$/);
	await expect(menu).toHaveCount(0);
	await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
	await expect(page.locator("#main")).not.toHaveAttribute("inert", "");
	await expect(page.locator("main h1")).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/custom-orders\/$/);
	await expect(brief).toHaveValue("A lotus pond for our hallway");
	await expect(page.getByLabel("Your name")).toHaveValue("A visitor");
	await expect(page.getByLabel("Email or WhatsApp number")).toHaveValue("visitor@example.invalid");
	await expect(page.locator("html")).toHaveClass(/dark/);
});

for (const route of ["/events/", "/workshops/", "/contact/"] as const) {
	test(`${route} ends on one closing CTA with a 44px action`, async ({ page }) => {
		await page.goto(route);
		const closing = page.locator('[data-slot="closing-cta"]');
		await expect(closing).toHaveCount(1);
		await closing.scrollIntoViewIfNeeded();
		await expectTouchTarget(closing.getByRole("link"));
	});
}

test("@mobile conversion buttons meet the 44px floor", async ({ page }) => {
	await page.goto("/workshops/");
	const enquire = page.getByRole("link", { name: "Enquire" });
	expect(await enquire.count()).toBeGreaterThan(0);
	for (const link of await enquire.all()) {
		await link.scrollIntoViewIfNeeded();
		await expectTouchTarget(link);
	}

	await page.goto("/about/");
	const commission = page.getByRole("link", { name: "Commission a piece" });
	await commission.scrollIntoViewIfNeeded();
	await expectTouchTarget(commission);

	await page.goto("/login/");
	await expectTouchTarget(page.getByRole("link", { name: "Back to site" }));

	await page.goto("/access-denied/");
	// Fixture mode deliberately has no root maintainer email to expose.
	await expect(page.getByRole("link", { name: /^Request access/ })).toHaveCount(0);
	await expectTouchTarget(page.getByRole("button", { name: "Try a different account" }));
	await expectTouchTarget(page.getByRole("link", { name: "Back to site" }));
});

for (const theme of ["light", "dark"] as const) {
	test(`contact channels take keyboard focus in document order (${theme})`, async ({ page }) => {
		await useTheme(page, theme);
		await page.goto("/contact/");
		// Clicking the heading sets the sequential focus start point right before the channels.
		await page.locator("main h1").click();
		await page.keyboard.press("Tab");
		const whatsapp = page.getByRole("link", { name: /Fastest reply/ });
		await expectFocusOutline(whatsapp);

		const stops = [
			page.getByRole("link", { name: "Browse the WhatsApp catalogue" }),
			page.locator('main a[href^="mailto:"]'),
			page.locator('main a[href*="instagram.com"]').nth(0),
			page.locator('main a[href*="instagram.com"]').nth(1),
			page.locator('main a[href*="youtube.com"]'),
			page.locator('main a[href*="instagram.com"]').nth(2),
			page.getByRole("link", { name: "Start a brief" }),
		];
		for (const stop of stops) {
			await page.keyboard.press("Tab");
			await expectFocusOutline(stop);
		}
	});
}

test("contact cards lift 2px at the fast tempo on hover", async ({ page }, testInfo) => {
	// Hover is gated behind (hover: hover); the touch project has no hover state.
	test.skip(testInfo.project.name === "mobile-chromium", "hover-capable pointers only");
	await page.goto("/contact/");
	const email = page.locator('main a[href^="mailto:"]');
	await email.scrollIntoViewIfNeeded();
	await email.hover();
	await expect(email).toHaveCSS("transition-duration", "0.15s");
	await expect.poll(() => email.evaluate((el) => getComputedStyle(el).translate)).toBe("0px -2px");
});

test("FAQ list shares the heading's left axis", async ({ page }) => {
	await page.goto("/trust/");
	const heading = await page.locator("main h1").boundingBox();
	const list = await page.locator("main .divide-y").boundingBox();
	expect(Math.abs((list?.x ?? 0) - (heading?.x ?? 0))).toBeLessThanOrEqual(1);
});

test("@mobile FAQ summaries meet the 44px floor", async ({ page }) => {
	await page.goto("/trust/");
	for (const summary of await page.locator("summary").all()) {
		await expectTouchTarget(summary);
	}
});

test("FAQ answers render exactly as written in site.json", async ({ page }) => {
	const site = JSON.parse(readFileSync(resolve("data/site.json"), "utf8")) as {
		trust: { faqs: { question: string; answer: string }[] };
	};
	await page.goto("/trust/");
	const details = page.locator("main details");
	await expect(details).toHaveCount(site.trust.faqs.length);
	for (const [i, faq] of site.trust.faqs.entries()) {
		await expect(details.nth(i).locator("summary")).toContainText(faq.question);
		await expect(details.nth(i).locator("p")).toHaveText(faq.answer);
	}
});

test("event overflow tile uses the scrim token with a paper label in dark", async ({ page }) => {
	await useTheme(page, "dark");
	await page.goto("/events/");
	const tile = page.getByRole("button", { name: /^View all 7 photos from / });
	const overlay = tile.locator("span").first();
	await expect(overlay).toHaveClass(/bg-scrim\/60/);
	await expect(overlay).not.toHaveClass(/bg-black/);
	const expected = await page.evaluate(() => {
		const scratch = document.createElement("span");
		scratch.style.color = getComputedStyle(document.documentElement).getPropertyValue(
			"--color-ink",
		);
		document.body.append(scratch);
		const color = getComputedStyle(scratch).color;
		scratch.remove();
		return color;
	});
	await expect(overlay).toHaveCSS("color", expected);
});

test("events carry anchors and the first two articles are server-visible", async ({ page }) => {
	await page.goto("/events/#fixture-event-past");
	const anchor = page.locator("#fixture-event-past");
	await expect(anchor).toBeVisible();
	await expect
		.poll(async () => {
			const y = (await anchor.boundingBox())?.y;
			return y !== undefined && y >= 61 && y <= 120;
		})
		.toBe(true);

	await page.goto("/events/", { waitUntil: "commit" });
	await expect(page.locator("main article")).toHaveCount(2);
	await expect(page.locator("main article.reveal-up")).toHaveCount(2);
});

test("event viewer escapes a transformed clipped card and keeps keyboard focus inside", async ({
	page,
}, testInfo) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/events/");
	const article = page.locator("main article").first();
	// A populated catalog fixture is required for this regression.
	const trigger = article.getByRole("button", { name: /^View photo 1 from / });
	await expect(article).not.toHaveCSS("transform", "none");
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	expect(await dialog.evaluate((element) => element.parentElement === document.body)).toBe(true);
	const box = await dialog.boundingBox();
	const viewport = page.viewportSize();
	expect(box?.x).toBe(0);
	expect(box?.y).toBe(0);
	expect(box?.width).toBe(viewport?.width);
	expect(box?.height).toBe(viewport?.height);

	// Edge arrows: 44px with a mouse, 48px on a coarse pointer (read once the panel spring settles).
	const next = dialog.getByRole("button", { name: "Next photo", exact: true });
	const expected = testInfo.project.name === "mobile-chromium" ? 48 : 44;
	await expect
		.poll(async () => {
			const arrow = await next.boundingBox();
			return [Math.round(arrow?.width ?? 0), Math.round(arrow?.height ?? 0)];
		})
		.toEqual([expected, expected]);

	await page.screenshot({
		path: test.info().outputPath("event-viewer.png"),
		animations: "disabled",
	});
	await expectModalFocus(page, trigger, next);
});

async function interceptLead(page: Page, handler: (route: Route) => Promise<void>) {
	await page.route(/\/custom-orders\/?(?:\?.*)?$/, (route) => {
		if (route.request().method() === "POST") return handler(route);
		return route.continue();
	});
}

async function leadResponse(route: Route, ok: boolean) {
	await route.fulfill({
		contentType: "text/x-component",
		body: `0:${JSON.stringify({ a: { ok }, f: "" })}\n`,
	});
}

const CONTINUE = "Continue to WhatsApp";

test("empty enquiries are rejected before any lead request", async ({ page }) => {
	let submissions = 0;
	await interceptLead(page, async (route) => {
		submissions += 1;
		await leadResponse(route, false);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("   ");
	await page.getByRole("button", { name: CONTINUE }).click();
	await expect(page.locator("form").getByRole("alert")).toContainText("Tell us a bit");
	await expect(page.locator('form a[href^="https://wa.me/"]')).toHaveCount(0);
	expect(submissions).toBe(0);
});

test("idle enquiry copy describes only the control on screen", async ({ page }, testInfo) => {
	await page.goto("/custom-orders/");
	const form = page.locator("form");
	await expect(form.getByRole("button")).toHaveCount(1);
	const button = form.getByRole("button", { name: CONTINUE });
	await expect(button).toBeVisible();
	// The old idle line described a WhatsApp control that was not on screen yet.
	await expect(page.getByText("Open WhatsApp to review")).toHaveCount(0);
	await expect(page.getByText("opens with your message ready to review")).toHaveCount(0);
	await expect(form.locator("#whatsapp-hint")).toHaveText(
		"Continue saves your brief and prepares a WhatsApp link. You review and send the message yourself.",
	);
	if (testInfo.project.name === "mobile-chromium") {
		await button.scrollIntoViewIfNeeded();
		await expectTouchTarget(button);
	}
});

test("failed lead saves retain explicit WhatsApp/email links with the reply contact", async ({
	page,
}) => {
	let submittedBody = "";
	await page.addInitScript(() => {
		globalThis.open = () => {
			document.body.dataset.scriptedPopup = "true";
			return null;
		};
	});
	await interceptLead(page, async (route) => {
		submittedBody = route.request().postData() ?? "";
		await leadResponse(route, false);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("A blue and gold peacock");
	const contact = page.getByLabel("Email or WhatsApp number");
	await expect(contact).toHaveAttribute("maxlength", "200");
	await contact.fill("visitor@example.com");
	await page.getByRole("button", { name: CONTINUE }).click();
	const whatsapp = page.locator('form a[href^="https://wa.me/"]');
	await expect(whatsapp).toBeFocused();
	await expect(page.locator("form").getByRole("alert")).toContainText(
		"couldn’t confirm your enquiry was saved",
	);
	expect(submittedBody).toContain("visitor@example.com");
	await expect(whatsapp).toBeVisible();
	await expect(whatsapp).toHaveAttribute("target", "_blank");
	await expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
	const message = new URL((await whatsapp.getAttribute("href")) ?? "").searchParams.get("text");
	expect(message).toContain("A blue and gold peacock");
	expect(message).toContain("Contact: visitor@example.com");
	await expect(page.locator('form a[href^="mailto:"]')).toBeVisible();
	const retry = page.getByRole("button", { name: "Try saving again" });
	await expect(retry).toBeEnabled();
	await expectTouchTarget(retry);
	await expect(page.locator("body")).not.toHaveAttribute("data-scripted-popup", "true");
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
});

test("saving is reported only after acknowledgement and never gates the WhatsApp link", async ({
	page,
}) => {
	let release!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	await interceptLead(page, async (route) => {
		await pending;
		await leadResponse(route, true);
	});
	await page.goto("/custom-orders/");
	await page.getByLabel("What would you like painted?").fill("A forest scene");
	await page.getByLabel("Email or WhatsApp number").fill("visitor@example.com");
	await page.getByRole("button", { name: CONTINUE }).click();
	try {
		const whatsapp = page.locator('form a[href^="https://wa.me/"]');
		await expect(whatsapp).toBeVisible();
		await expect(whatsapp).toBeFocused();
		await expect(page.getByRole("button", { name: CONTINUE })).toHaveCount(0);
		await expect(page.getByText("Saving your brief")).toBeVisible();
		await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
	} finally {
		release();
	}
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	await expect(
		page.getByText("We'll use your contact details to reply.", { exact: false }),
	).toBeVisible();
});

test("an old save response cannot mark an edited enquiry as saved", async ({ page }) => {
	let release!: () => void;
	let releaseEdited!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	const editedPending = new Promise<void>((resolve) => {
		releaseEdited = resolve;
	});
	let submissions = 0;
	await interceptLead(page, async (route) => {
		submissions += 1;
		await (submissions === 1 ? pending : editedPending);
		await leadResponse(route, true);
	});
	await page.goto("/custom-orders/");
	const brief = page.getByLabel("What would you like painted?");
	await brief.fill("The original brief");
	const request = page.waitForRequest(
		(request) =>
			request.method() === "POST" && new URL(request.url()).pathname === "/custom-orders/",
	);
	await page.getByRole("button", { name: CONTINUE }).click();
	await request;
	await brief.fill("The edited brief");
	const editedRequest = page.waitForRequest(
		(request) =>
			request.method() === "POST" && (request.postData() ?? "").includes("The edited brief"),
	);
	await page.getByRole("button", { name: CONTINUE }).click();
	release();
	try {
		await editedRequest;
		await expect(page.getByText("Saving your brief")).toBeVisible();
		await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
		const href = await page.locator('form a[href^="https://wa.me/"]').getAttribute("href");
		expect(new URL(href as string).searchParams.get("text")).toContain("The edited brief");
	} finally {
		releaseEdited();
	}
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
});

test("login and access-denied share one auth shell", async ({ page }) => {
	await page.goto("/login/");
	const loginHeading = await page
		.locator("main h1")
		.evaluate((el) => getComputedStyle(el).fontSize);
	await expect(page.locator("main > section > div > div")).toHaveCSS("max-width", "448px");
	await expect(page.locator("main")).toHaveCSS("min-height", /^(0px|auto)$/);

	await page.goto("/access-denied/");
	const deniedHeading = await page
		.locator("main h1")
		.evaluate((el) => getComputedStyle(el).fontSize);
	expect(deniedHeading).toBe(loginHeading);
	await expect(page.locator("main > section > div > div")).toHaveCSS("max-width", "448px");
	await expect(page.locator("main")).toHaveCSS("min-height", /^(0px|auto)$/);
});

for (const theme of ["light", "dark"] as const) {
	for (const route of ["/login/", "/access-denied/"] as const) {
		test(`${route} passes ${theme} accessibility checks`, async ({ page }) => {
			await useTheme(page, theme);
			const response = await page.goto(route);
			expect(response?.ok()).toBe(true);
			await settleAnimations(page);
			const accessibility = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
			expect(accessibility.violations).toEqual([]);
		});
	}
}
