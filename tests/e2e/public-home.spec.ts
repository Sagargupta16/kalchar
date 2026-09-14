import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { AVAILABLE_PREVIEW_COUNT } from "../../lib/home-catalog";

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));
const WHATSAPP_GREETING = "Hi, I found you on kalchar.co.in.";

test.beforeEach(async ({ page }) => {
	await page.route("**/media/**", (route) =>
		route.fulfill({ body: MEDIA_FIXTURE, contentType: "image/jpeg" }),
	);
});

/** Finish every finishable animation so geometry reads at rest (loops are caught). */
async function settleAnimations(page: Page) {
	await page.evaluate(() => {
		for (const animation of document.getAnimations()) {
			try {
				animation.finish();
			} catch {
				// Infinite decorative animations (wash, sheen) cannot be finished.
			}
		}
	});
}

test("hero art is in the first phone screen", { tag: "@mobile" }, async ({ page }) => {
	await page.goto("/");
	await settleAnimations(page);

	const h1 = page.locator("main h1");
	const plate = page.locator("[data-shuffle-status]");
	await expect(plate.locator(".hero-plate img").nth(1)).toBeVisible();

	const h1Box = await h1.boundingBox();
	const plateBox = await plate.boundingBox();
	const viewport = page.viewportSize();
	if (!h1Box || !plateBox || !viewport) throw new Error("missing hero geometry");

	expect(plateBox.y).toBeGreaterThan(h1Box.y + h1Box.height);
	expect(plateBox.y).toBeLessThan(400);
	expect(plateBox.y).toBeLessThan(viewport.height);
	expect(Math.abs(plateBox.width - 320)).toBeLessThanOrEqual(1);
	expect(Math.abs(plateBox.x - (viewport.width - plateBox.width) / 2)).toBeLessThanOrEqual(1);

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
});

test("hero title and lead render immediately; the stagger covers secondary elements", async ({
	page,
}) => {
	await page.goto("/");
	const hero = page.locator("main section").first();

	// Ruling 44: no Reveal of any kind around the h1 or the lead.
	await expect(hero.locator(".reveal-up h1, h1.reveal-up")).toHaveCount(0);
	await expect(hero.locator(".reveal-up .t-lead, .t-lead.reveal-up")).toHaveCount(0);
	await expect(hero.locator("[data-motion-reveal]")).toHaveCount(0);
	await expect(hero.locator(".t-lead")).toBeVisible();

	// Eager stagger: eyebrow, plate, chips, CTAs at staggerDelay(0, 2, 4, 5);
	// inside the plate cell the wall-label lines rise at staggerDelay(1..3)
	// (visual-direction 2.1: counter, title, meta at 60/120/180ms).
	const delays = await hero
		.locator(".reveal-up")
		.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.animationDelay));
	expect(delays).toEqual(["0ms", "120ms", "60ms", "120ms", "180ms", "240ms", "300ms"]);
});

test("style chips are deep links with 44px hit boxes", async ({ page }) => {
	await page.goto("/");
	const chips = page.locator('main nav[aria-label="Browse by style"] a');
	const count = await chips.count();
	expect(count).toBeGreaterThan(0);

	for (const chip of await chips.all()) {
		const href = await chip.getAttribute("href");
		expect(href).toMatch(/^\/work\/?\?style=/);
		const hitHeight = await chip.evaluate((el) => {
			const rect = el.getBoundingClientRect();
			const after = getComputedStyle(el, "::after");
			const top = Number.parseFloat(after.top) || 0;
			const bottom = Number.parseFloat(after.bottom) || 0;
			return rect.height - top - bottom;
		});
		expect(hitHeight).toBeGreaterThanOrEqual(44);
	}

	const first = chips.first();
	const styleName = (await first.innerText()).trim();
	await first.click();
	await expect(page).toHaveURL(/\/work\/?\?style=/);
	await expect(page.getByRole("button", { name: styleName, exact: true })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});

test("Available preview is bounded, deduped and lands on the buy lens", async ({ page }) => {
	await page.goto("/");
	const workHrefs = await page
		.locator('#work a[href^="/work/"]')
		.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
	const availableCards = page.locator('#available a[href^="/work/"]');
	const availableHrefs = await availableCards.evaluateAll((els) =>
		els.map((el) => el.getAttribute("href")),
	);

	expect(availableHrefs.length).toBeGreaterThan(0);
	expect(availableHrefs.length).toBeLessThanOrEqual(AVAILABLE_PREVIEW_COUNT);
	for (const href of availableHrefs) {
		expect(workHrefs).not.toContain(href);
	}

	// Fixture catalog: exactly one for-sale piece (the hero), so the CTA is singular.
	expect(availableHrefs).toHaveLength(1);
	const cta = page.locator("#available").getByRole("link", { name: "See the piece for sale" });
	await expect(cta).toBeVisible();
	await cta.click();
	await expect(page).toHaveURL(/\/work\/?\?view=available/);
	await expect(page.getByRole("button", { name: /Available to buy/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});

for (const theme of ["light", "dark"] as const) {
	test(`heading outline and landmarks hold in ${theme}`, async ({ page }) => {
		await page.addInitScript((selectedTheme) => {
			localStorage.setItem("theme", selectedTheme);
		}, theme);
		await page.goto("/");

		await expect(page.locator("h1")).toHaveCount(1);
		const sections = page.locator("main > section");
		const sectionCount = await sections.count();
		expect(sectionCount).toBeGreaterThanOrEqual(7);
		for (let i = 1; i < sectionCount; i += 1) {
			expect(await sections.nth(i).locator("h2").count()).toBeGreaterThanOrEqual(1);
		}
		for (const id of ["work", "available", "about", "workshops", "events", "custom-orders", "contact"]) {
			await expect(page.locator(`main section[id="${id}"]`)).toHaveCount(1);
		}
		await expect(page.getByRole("heading", { level: 2, name: "In their words" })).toBeVisible();
	});
}

test("every section heading sits on the display-sm rung", async ({ page }) => {
	await page.goto("/");
	const sizes = await page
		.locator("main section h2.text-display-sm")
		.evaluateAll((els) => els.map((el) => Number.parseFloat(getComputedStyle(el).fontSize)));
	expect(sizes.length).toBeGreaterThanOrEqual(6);
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("missing viewport");
	// --text-display-sm: clamp(2.5rem, 1.597rem + 3.71vw, 4.5rem) -> 40px at 390, 72px at 1280.
	const expected = Math.min(Math.max(25.552 + 0.0371 * viewport.width, 40), 72);
	for (const size of sizes) {
		expect(Math.abs(size - expected)).toBeLessThanOrEqual(1);
	}
});

test("the hero h1 carries the roman headline voice on the display rung", async ({ page }) => {
	await page.goto("/");
	const probe = await page.locator("main h1").evaluate((el) => {
		const cs = getComputedStyle(el);
		return { fontSize: Number.parseFloat(cs.fontSize), fontWeight: cs.fontWeight, fontStyle: cs.fontStyle };
	});
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("missing viewport");
	// --text-display: clamp(2.75rem, 1.545rem + 4.94vw, 5.5rem) -> 44px at 390, 88px at 1280.
	const expected = Math.min(Math.max(24.72 + 0.0494 * viewport.width, 44), 88);
	expect(Math.abs(probe.fontSize - expected)).toBeLessThanOrEqual(1);
	expect(probe.fontWeight).toBe("600");
	expect(probe.fontStyle).toBe("normal");
});

test("kachni seams open every home section after the hero", async ({ page }) => {
	await page.goto("/");
	const sections = page.locator("main > section");
	const count = await sections.count();
	expect(count).toBeGreaterThanOrEqual(7);
	await expect(sections.nth(0).locator('[role="presentation"]')).toHaveCount(0);
	for (let i = 1; i < count; i += 1) {
		const rule = sections.nth(i).locator('[role="presentation"]');
		await expect(rule).toHaveCount(1);
		const height = await rule.evaluate((el) => el.getBoundingClientRect().height);
		expect(Math.round(height)).toBe(7);
	}
});

test("one gold sheen loops on the hero front plate only", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator('.gold-sheen[data-sheen="loop"]')).toHaveCount(1);
	await expect(
		page.locator("main > section").first().locator('.gold-sheen[data-sheen="loop"]'),
	).toHaveCount(1);
});

test("the pigment wash sits behind the hero with no blur filter", async ({ page }) => {
	await page.goto("/");
	const wash = await page
		.locator("main > section")
		.first()
		.evaluate((section) => {
			const host = section.querySelector(':scope > [aria-hidden="true"]');
			if (!host) return null;
			const children = Array.from(host.children);
			return {
				count: children.length,
				filters: children.map((child) => getComputedStyle(child).filter),
				pointerEvents: getComputedStyle(host).pointerEvents,
			};
		});
	expect(wash).not.toBeNull();
	expect(wash?.count).toBe(2);
	expect(wash?.pointerEvents).toBe("none");
	for (const filter of wash?.filters ?? []) {
		expect(filter).toBe("none");
	}
});

test("the Selected grid leads with a spanning tile", async ({ page }) => {
	await page.goto("/");
	const grid = page.locator("#work ul").first();
	const gridBox = await grid.boundingBox();
	const leadBox = await grid.locator("li").first().boundingBox();
	if (!gridBox || !leadBox) throw new Error("missing grid geometry");
	expect(Math.abs(leadBox.width - gridBox.width)).toBeLessThanOrEqual(2);
});

test("the hero wall label numbers the featured piece", async ({ page }) => {
	await page.goto("/");
	const counter = page.locator("[data-shuffle-status] .t-meta").first();
	await expect(counter).toContainText("Featured");
	await expect(counter).toContainText(/No\. \d{2} of \d+/);
});

test("LCP priority stays on the first Selected cards only", async ({ page }) => {
	await page.goto("/");
	const workCards = await page.locator('#work a[href^="/work/"]').count();
	await expect(page.locator('#work img[fetchpriority="high"]')).toHaveCount(Math.min(3, workCards));
	await expect(page.locator('#available img[fetchpriority="high"]')).toHaveCount(0);
	await expect(page.locator('#events img[fetchpriority="high"]')).toHaveCount(0);
	await expect(page.locator('#events img[decoding="sync"]')).toHaveCount(0);
});

test("workshop and event cards navigate to their anchors", async ({ page }) => {
	await page.goto("/");
	const workshopCard = page.locator('#workshops a[href^="/workshops#"]').first();
	await expect(workshopCard).toBeVisible();
	await workshopCard.click();
	await expect(page).toHaveURL(/\/workshops\/?#[\w-]+$/);

	await page.goto("/");
	const eventCard = page.locator('#events a[href^="/events#"]').first();
	await eventCard.scrollIntoViewIfNeeded();
	await eventCard.click();
	await expect(page).toHaveURL(/\/events\/?#[\w-]+$/);
});

test("the hero offers a quiet WhatsApp route with the greeting prefilled", async ({ page }) => {
	await page.goto("/");
	const link = page.locator("main section").first().locator('a[href^="https://wa.me/"]');
	await expect(link).toHaveText(/Message on WhatsApp/);
	await expect(link).toHaveCSS("min-height", "44px");
	const href = await link.getAttribute("href");
	const text = new URL(href ?? "").searchParams.get("text");
	expect(text).toBe(WHATSAPP_GREETING);
});

test("the events photo chip flips with the theme", async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem("theme", "dark");
	});
	await page.goto("/");
	const chip = page.locator("#events").getByText(/photos$/).first();
	await chip.scrollIntoViewIfNeeded();
	const { chipColor, inkColor } = await chip.evaluate((el) => {
		const probe = document.createElement("span");
		probe.style.color = "var(--color-ink)";
		document.body.appendChild(probe);
		const inkValue = getComputedStyle(probe).color;
		probe.remove();
		return { chipColor: getComputedStyle(el).color, inkColor: inkValue };
	});
	expect(chipColor).toBe(inkColor);
	await expect(page.locator('main [class*="bg-black"]')).toHaveCount(0);
});

test("keyboard focus shows the global outline with no ring", async ({ page }) => {
	await page.goto("/");
	await settleAnimations(page);

	const reachByTab = async (predicate: string) => {
		for (let i = 0; i < 40; i += 1) {
			await page.keyboard.press("Tab");
			const matched = await page.evaluate(
				(selector) => document.activeElement?.matches(selector) ?? false,
				predicate,
			);
			if (matched) return;
		}
		throw new Error(`Tab never reached ${predicate}`);
	};

	await reachByTab('a[aria-label^="View "]');
	const plateStyles = await page.evaluate(() => {
		const el = document.activeElement as HTMLElement;
		const cs = getComputedStyle(el);
		return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
	});
	expect(plateStyles.outlineStyle).toBe("solid");
	expect(plateStyles.outlineWidth).toBe("2px");
	expect(plateStyles.boxShadow).toBe("none");

	await reachByTab('a[href^="/work?style="], a[href^="/work/?style="]');
	const chipStyles = await page.evaluate(() => {
		const el = document.activeElement as HTMLElement;
		const cs = getComputedStyle(el);
		return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
	});
	expect(chipStyles.outlineStyle).toBe("solid");
	expect(chipStyles.outlineWidth).toBe("2px");
	expect(chipStyles.boxShadow).toBe("none");
});
