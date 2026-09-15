import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, type Route, test } from "@playwright/test";
import { DUR } from "../../lib/motion";
import { settleAnimations } from "./helpers/animation-settle";

/**
 * Visual-upgrade contracts for public pages B (visual-direction 2.8-2.11):
 * the commission sheet, contact, trust, and the auth shell. Complements
 * public-pages.spec.ts (behavioural contracts, untouched by this pass).
 */

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

async function useTheme(page: Page, theme: "light" | "dark") {
	await page.addInitScript((selected) => localStorage.setItem("theme", selected), theme);
}

/** Computed colour of a custom property, via a scratch element. */
async function resolveColor(page: Page, cssVar: string) {
	return page.evaluate((name) => {
		const scratch = document.createElement("span");
		scratch.style.color = `var(${name})`;
		document.body.append(scratch);
		const color = getComputedStyle(scratch).color;
		scratch.remove();
		return color;
	}, cssVar);
}

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

/* ------------------------- custom orders (2.8) ------------------------- */

test("commission sheet opens with a clear eyebrow and layered shadow", async ({
	page,
}) => {
	await page.goto("/custom-orders/");
	const card = page.locator('[data-slot="commission-card"]');
	await expect(card).toBeVisible();
	await expect(card.getByText("Commission brief", { exact: true })).toBeVisible();
	// The shared e1 shadow retains layered depth on the standard surface.
	const shadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
	expect(shadow.split("px,").length).toBeGreaterThan(1);
	await expect(card.locator('> span[class*="gold-hairline"]')).toHaveCount(0);
});

test("budget presets render as a chip radio group, neutral first, 44px floor", async ({ page }) => {
	await page.goto("/custom-orders/");
	const budget = page.locator("fieldset", { hasText: "Budget" });
	const radios = budget.getByRole("radio");
	expect(await radios.count()).toBeGreaterThanOrEqual(2);
	// The first chip is the explicit neutral with the empty value, pre-checked;
	// no priced chip is ever checked by default.
	const first = radios.first();
	await expect(first).toBeChecked();
	expect(await first.getAttribute("value")).toBe("");
	await expect(budget.getByText("Open / not sure", { exact: true })).toBeVisible();
	for (const chip of await budget.locator("label").all()) {
		const box = await chip.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
	}
});

test("a picked budget chip shows two cues and rides into the WhatsApp message", async ({
	page,
}) => {
	await interceptLead(page, (route) => leadResponse(route, true));
	await page.goto("/custom-orders/");
	const budget = page.locator("fieldset", { hasText: "Budget" });
	const chipLabel = budget.locator("label").nth(1);
	const chipText = (await chipLabel.innerText()).trim();
	await chipLabel.click();
	const chip = budget.getByRole("radio", { name: chipText });
	await expect(chip).toBeChecked();
	// Two cues, not colour alone: the check glyph mounts inside the pill.
	await expect(chipLabel.locator("svg")).toBeVisible();

	await page.getByLabel("What would you like painted?").fill("A lotus pond for the hallway");
	await page.getByRole("button", { name: "Continue to WhatsApp" }).click();
	const whatsapp = page.locator('form a[href^="https://wa.me/"]');
	await expect(whatsapp).toBeVisible();
	const message = new URL((await whatsapp.getAttribute("href")) ?? "").searchParams.get("text");
	expect(message).toContain(`Budget: ${chipText}`);
	// The saved panel echoes the choice (specific beats generic).
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	await expect(page.getByText(`budget ${chipText}`, { exact: false })).toBeVisible();
});

test("the selected style sample carries the ring and the gold inset line", async ({ page }) => {
	await page.goto("/custom-orders/");
	const group = page.getByRole("radiogroup", { name: "Preferred style" });
	const sample = group.locator("label").nth(1);
	await sample.scrollIntoViewIfNeeded();
	await sample.click();
	await expect(sample.getByRole("radio")).toBeChecked();
	// Cue 1: the 2px section-pigment ring, offset 2px, on the plate.
	await expect(sample.locator('[class*="ring-2"]')).toHaveCount(1);
	// Cue 2: the concentric gold inset line rests at full opacity.
	await expect(sample.locator('span[class*="gold-hairline"]')).toHaveCSS("opacity", "1");
});

test("the steps read as wall text with roman numerals in the section pigment", async ({ page }) => {
	await page.goto("/custom-orders/");
	const numerals = page.locator("main aside .t-numeral");
	await expect(numerals).toHaveCount(3);
	await expect(numerals.nth(0)).toHaveText("I");
	await expect(numerals.nth(1)).toHaveText("II");
	await expect(numerals.nth(2)).toHaveText("III");
	await expect(numerals.first()).toHaveCSS("font-style", "italic");
	await expect(numerals.first()).toHaveCSS("color", await resolveColor(page, "--color-vermillion"));
});

test("one style sample idles on the float breath and continues across OS preference changes", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/custom-orders/");
	// One floating plate per page (steering 2026-09-14): the first
	// artwork-backed sample only, never the whole picker grid.
	const floats = page.locator("main .plate-float");
	await expect(floats).toHaveCount(1);
	const group = page.getByRole("radiogroup", { name: "Preferred style" });
	await expect(group.locator(".plate-float")).toHaveCount(1);
	expect(await floats.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
	await page.emulateMedia({ reducedMotion: "reduce" });
	expect(await floats.evaluate((el) => getComputedStyle(el).animationName)).toBe("plate-float");
});

test("the example strip follows the shared compact section spacing", async ({ page }) => {
	await page.goto("/custom-orders/");
	const strip = page.locator('[data-slot="example-strip"]');
	await expect(strip).toBeVisible();
	const grid = page.locator("main .md\\:grid-cols-12").first();
	const gridBox = await grid.boundingBox();
	const stripBox = await strip.boundingBox();
	const gap = (stripBox?.y ?? 0) - ((gridBox?.y ?? 0) + (gridBox?.height ?? 0));
	const margin = await strip.evaluate((element) => Number.parseFloat(getComputedStyle(element).marginTop));
	expect(gap).toBeCloseTo(margin, 0);
	expect(gap).toBeGreaterThanOrEqual(48);
	expect(gap).toBeLessThanOrEqual(81);
});

test("@mobile every commission field meets the 44px floor with 16px text", async ({ page }) => {
	await page.goto("/custom-orders/");
	for (const label of ["What would you like painted?", "Your name", "Email or WhatsApp number"]) {
		const field = page.getByLabel(label);
		await field.scrollIntoViewIfNeeded();
		const box = await field.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		const size = await field.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
		expect(size).toBeGreaterThanOrEqual(16);
	}
});

/* ---------------------------- contact (2.9) ---------------------------- */

test("the phone number is the numeral headline on a standard bordered card", async ({ page }) => {
	await page.goto("/contact/");
	const card = page.getByRole("link", { name: /Fastest reply/ });
	await expect(card).toHaveCSS("border-top-width", "1px");
	await expect(card).toHaveCSS("border-bottom-width", "1px");
	await expect(card).toHaveCSS("border-top-color", await resolveColor(page, "--color-line"));

	const phone = card.locator(".t-numeral");
	await expect(phone).toBeVisible();
	await expect(phone).toHaveCSS("font-style", "italic");
	await expect(phone).toHaveCSS("font-variant-numeric", "tabular-nums");
	await expect(phone).toHaveCSS("user-select", "all");
	const size = await phone.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
	expect(size).toBeGreaterThanOrEqual(24);
});

test("the follow-along channels render as plate tiles with wall labels", async ({ page }) => {
	await page.goto("/contact/");
	const tiles = page.locator("main ul > li a");
	expect(await tiles.count()).toBeGreaterThanOrEqual(2);
	// Every tile keeps its handle and purpose caption.
	await expect(tiles.first().locator("figcaption")).toContainText("@");
	// The grid runs two columns on phones: the first two tiles share a row.
	const first = await tiles.nth(0).boundingBox();
	const second = await tiles.nth(1).boundingBox();
	expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThanOrEqual(1);
});

test("the closing CTA holds a static wash and no running animations", async ({ page }) => {
	await page.goto("/contact/");
	const closing = page.locator('[data-slot="closing-cta"]');
	await closing.scrollIntoViewIfNeeded();
	// Two wash ellipses render (drift off), and nothing inside the band runs.
	await expect(closing.locator('div[aria-hidden="true"] > div')).toHaveCount(2);
	await expect
		.poll(() =>
			closing.evaluate(
				(el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
			),
		)
		.toBe(0);
});

test("the floating WhatsApp disc never mounts on the contact page", async ({ page }) => {
	await page.goto("/contact/");
	await expect(page.locator("[data-enquire-fab]")).toHaveCount(0);
});

/* ----------------------------- trust (2.10) ---------------------------- */

test("an open FAQ summary tints on the wash and its answer fades up at the base tempo", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/trust/");
	const first = page.locator("main details").first();
	const summary = first.locator("summary");
	const closedBg = await summary.evaluate((el) => getComputedStyle(el).backgroundColor);
	await summary.click();
	await expect(first).toHaveAttribute("open", "");
	const openBg = await summary.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(openBg).not.toBe(closedBg);
	// Native details handles layout; the answer only fades and translates.
	const wrapper = first.locator("summary + div");
	const animation = await wrapper.evaluate((el) => getComputedStyle(el).animationName);
	expect(animation).toContain("faq-answer-in");
	await expect(wrapper).toHaveCSS("animation-duration", `${DUR.base}s`);
});

test("FAQ answers animate even when the OS requests reduced motion", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/trust/");
	const first = page.locator("main details").first();
	await first.locator("summary").click();
	await expect(first).toHaveAttribute("open", "");
	const wrapper = first.locator("summary + div");
	const animation = await wrapper.evaluate((el) => getComputedStyle(el).animationName);
	expect(animation).toContain("faq-answer-in");
	await expect(first.locator("p")).toBeVisible();
});

/* ------------------------- login + denied (2.11) ----------------------- */

for (const route of ["/login/", "/access-denied/"] as const) {
	test(`${route} keeps its actions in one compact card without decorative rules`, async ({ page }) => {
		await page.goto(route);
		await expect(page.locator('main [data-slot="auth-card"]')).toHaveCount(1);
		await expect(page.locator('main span[class*="gold-hairline"]')).toHaveCount(0);
		// No wash bands or motifs on the auth surfaces.
		await expect(page.locator("main section")).not.toHaveClass(/bg-\(--section-wash\)/);
	});
}

test("the auth sheet sits on the glass material with its own elevation", async ({ page }) => {
	await page.goto("/login/");
	const card = page.locator('main [data-slot="auth-card"]');
	const material = await card.evaluate((el) => {
		const computed = getComputedStyle(el);
		return { backdrop: computed.backdropFilter, shadow: computed.boxShadow };
	});
	// material-glass: static blur + saturate over the token tint, hairline + e2
	// in one box-shadow list (opaque fallback where backdrop-filter is missing).
	expect(material.backdrop).toContain("blur(16px)");
	expect(material.backdrop).toContain("saturate(1.5)");
	expect(material.shadow).not.toBe("none");
});

test("the Google button meets the 44px floor", async ({ page }) => {
	await page.goto("/login/");
	await expectTouchTarget(page.getByRole("button", { name: "Continue with Google" }));
});

/* ------------------------------ axe gates ------------------------------ */

for (const theme of ["light", "dark"] as const) {
	for (const route of ["/custom-orders/", "/contact/", "/trust/"] as const) {
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
