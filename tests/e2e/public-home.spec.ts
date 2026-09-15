import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { AVAILABLE_PREVIEW_COUNT } from "../../lib/home-catalog";
import { STAGGER } from "../../lib/motion";

const MEDIA_FIXTURE = readFileSync(resolve("public/artworks/twin-fish.jpg"));

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
				// Infinite decorative animations cannot be finished.
			}
		}
	});
}

async function fontSizeForToken(page: Page, token: string) {
	return page.evaluate((name) => {
		const probe = document.createElement("span");
		probe.style.fontSize = `var(${name})`;
		document.body.append(probe);
		const size = Number.parseFloat(getComputedStyle(probe).fontSize);
		probe.remove();
		return size;
	}, token);
}

test("hero art is in the first phone screen", { tag: "@mobile" }, async ({ page }) => {
	await page.goto("/");
	await settleAnimations(page);

	const h1 = page.locator("main h1");
	const plate = page.locator("[data-shuffle-status]");
	await expect(plate.locator('.hero-plate a img').last()).toBeInViewport({ ratio: 0.5 });

	const h1Box = await h1.boundingBox();
	const plateBox = await plate.boundingBox();
	const viewport = page.viewportSize();
	if (!h1Box || !plateBox || !viewport) throw new Error("missing hero geometry");

	expect(plateBox.y).toBeGreaterThan(h1Box.y + h1Box.height);
	expect(plateBox.y).toBeLessThan(viewport.height / 2);
	expect(plateBox.width).toBeLessThanOrEqual(viewport.width - 32);
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

	// Essential copy paints immediately; only secondary content waits for a reveal.
	await expect(hero.locator("h1")).toHaveText("Folk art, full of life.");
	await expect(hero.locator(".reveal-up h1, h1.reveal-up")).toHaveCount(0);
	await expect(hero.locator(".reveal-up .t-lead, .t-lead.reveal-up")).toHaveCount(0);
	await expect(hero.locator("[data-motion-reveal]")).toHaveCount(0);
	await expect(hero.locator(".t-lead")).toBeVisible();

	const delays = await hero
		.locator(".reveal-up")
		.evaluateAll((els) =>
			els.map((el) => Number.parseFloat((el as HTMLElement).style.animationDelay)),
		);
	expect(delays.length).toBeGreaterThan(0);
	expect(delays.some((delay) => delay > 0)).toBe(true);
	for (const delay of delays) {
		expect(delay).toBeGreaterThanOrEqual(0);
		expect(delay).toBeLessThanOrEqual(STAGGER.stepMs * STAGGER.maxIndex);
	}
});

test("style links have 44px targets and select their destination style", async ({ page }) => {
	await page.goto("/");
	const chips = page.locator('main nav[aria-label="Browse by style"] a');
	const count = await chips.count();
	expect(count).toBeGreaterThan(0);

	for (const chip of await chips.all()) {
		const href = await chip.getAttribute("href");
		expect(href).toMatch(/^\/work\/?\?style=/);
		expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(44);
		await expect(chip).toHaveCSS("backdrop-filter", "none");
	}

	const first = chips.first();
	const styleName = (await first.innerText()).trim();
	await first.click();
	await expect(page).toHaveURL(/\/work\/?\?style=/);
	await expect(page.getByRole("button", { pressed: true }).filter({ hasText: styleName })).toHaveCount(1);
});

test("Available preview is bounded, deduped and lands on the buy lens", async ({ page }) => {
	await page.goto("/");
	const workHrefs = await page
		.locator('#work a[href^="/work/"]')
		.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
	const availableCards = page.locator('#available li a[href^="/work/"]');
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

test("home contact details remain readable without truncation", async ({ page }) => {
	await page.goto("/#contact");
	const channels = page.locator('#contact a[href^="https:"], #contact a[href^="mailto:"]');
	await expect(channels).toHaveCount(3);
	for (const channel of await channels.all()) {
		const display = channel.locator("p").nth(1);
		await expect(display).toHaveCSS("white-space", "normal");
		const dimensions = await display.evaluate((element) => ({
			width: element.clientWidth,
			contentWidth: element.scrollWidth,
			overflow: getComputedStyle(element).textOverflow,
		}));
		expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
		expect(dimensions.overflow).not.toBe("ellipsis");
		expect((await channel.boundingBox())?.height).toBeGreaterThanOrEqual(44);
	}
	if ((page.viewportSize()?.width ?? 0) >= 1024) {
		expect((await page.locator("#contact").boundingBox())?.height).toBeLessThan(480);
	}
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

test("section headings use the shared h2 size below the hero headline", async ({ page }) => {
	await page.goto("/");
	const sizes = await page
		.locator("main section header h2")
		.evaluateAll((els) => els.map((el) => Number.parseFloat(getComputedStyle(el).fontSize)));
	expect(sizes.length).toBeGreaterThanOrEqual(6);
	const expected = await fontSizeForToken(page, "--text-h2");
	const heroSize = await fontSizeForToken(page, "--text-display");
	for (const size of sizes) {
		expect(Math.abs(size - expected)).toBeLessThanOrEqual(1);
		expect(size).toBeLessThan(heroSize);
	}
});

test("the hero h1 carries the roman headline voice on the display rung", async ({ page }) => {
	await page.goto("/");
	const probe = await page.locator("main h1").evaluate((el) => {
		const cs = getComputedStyle(el);
		return { fontSize: Number.parseFloat(cs.fontSize), fontWeight: cs.fontWeight, fontStyle: cs.fontStyle };
	});
	const expected = await fontSizeForToken(page, "--text-display");
	expect(Math.abs(probe.fontSize - expected)).toBeLessThanOrEqual(1);
	expect(probe.fontWeight).toBe("600");
	expect(probe.fontStyle).toBe("normal");
});

test("home sections use spacing and a single heading accent instead of patterned dividers", async ({ page }) => {
	await page.goto("/");
	const sections = page.locator("main > section");
	const count = await sections.count();
	expect(count).toBeGreaterThanOrEqual(7);
	await expect(sections.locator('[role="presentation"]')).toHaveCount(0);
	const headers = sections.locator("header");
	expect(await headers.count()).toBeGreaterThanOrEqual(6);
	for (const header of await headers.all()) {
		await expect(header.locator(".rule-draw")).toHaveCount(0);
		await expect(header.locator("h2")).toHaveCSS("margin-top", "12px");
		const lead = header.locator(".t-lead");
		if (await lead.count()) await expect(lead).toHaveCSS("margin-top", "16px");
	}
});

test("hero plates show complete images without a sheen overlay", async ({ page }) => {
	await page.goto("/");
	const stage = page.locator("[data-shuffle-status]");
	await expect(stage).toHaveAttribute("data-shuffle-status", "applied");
	for (const plate of await stage.locator(".hero-plate").all()) {
		await expect(plate.locator("img")).toHaveCount(1);
		await expect(plate.locator("img")).toHaveCSS("object-fit", "contain");
	}
	await expect(stage.locator(".gold-sheen")).toHaveCount(0);
});

test("hero plates idle-float out of phase and pause offscreen", async ({ page }) => {
	await page.goto("/");
	const floats = page.locator("[data-shuffle-status] .plate-float");
	await expect(floats).toHaveCount(2);

	// Back then front in DOM order: the pair breathes at different periods and
	// phases (steering 2026-09-14), both running while the hero is on screen.
	const probes = await floats.evaluateAll((els) =>
		els.map((el) => {
			const cs = getComputedStyle(el);
			return {
				name: cs.animationName,
				duration: cs.animationDuration,
				delay: cs.animationDelay,
				state: cs.animationPlayState,
			};
		}),
	);
	for (const probe of probes) {
		expect(probe.name).toBe("plate-float");
		expect(probe.state).toBe("running");
	}
	expect(probes[0]?.duration).not.toBe(probes[1]?.duration);
	expect(probes[0]?.delay).not.toBe(probes[1]?.delay);

	// The loop stops once the stage scrolls out of view (--float-state gate).
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await expect
		.poll(() => floats.first().evaluate((el) => getComputedStyle(el).animationPlayState))
		.toBe("paused");
	await page.evaluate(() => window.scrollTo(0, 0));
	await expect
		.poll(() => floats.first().evaluate((el) => getComputedStyle(el).animationPlayState))
		.toBe("running");
});

test("hero plates keep floating under either OS preference", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	const floats = page.locator("[data-shuffle-status] .plate-float");
	await expect(floats).toHaveCount(2);
	for (const preference of ["reduce", "no-preference"] as const) {
		await page.emulateMedia({ reducedMotion: preference });
		for (const float of await floats.all()) {
			await expect(float).toHaveCSS("animation-name", "plate-float");
		}
	}
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

test("home artwork previews fit their item count and keep the single piece beside its introduction", async ({ page }) => {
	await page.goto("/");
	for (const [id, desktopColumns] of [["work", 3], ["available", 4]] as const) {
		const grid = page.locator(`#${id} ul`).first();
		await grid.scrollIntoViewIfNeeded();
		await settleAnimations(page);
		const gridBox = await grid.boundingBox();
		const cards = await grid.locator(":scope > li").evaluateAll((els) =>
			els.map((el) => {
				const { x, width } = el.getBoundingClientRect();
				return { x, width };
			}),
		);
		if (!gridBox || !cards[0]) throw new Error("missing grid geometry");
		const viewportWidth = page.viewportSize()?.width ?? 0;
		const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
		expect(columns).toBe(Math.min(cards.length, viewportWidth >= 1024 ? desktopColumns : 2));
		for (const card of cards) {
			expect(Math.abs(card.width - cards[0].width)).toBeLessThanOrEqual(1);
			expect(card.x).toBeGreaterThanOrEqual(gridBox.x - 1);
			expect(card.x + card.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1);
		}
		if (cards.length === 1) {
			const header = await page.locator(`#${id} header`).boundingBox();
			if (!header) throw new Error("missing single-preview introduction");
			expect(cards[0].width).toBeCloseTo(gridBox.width, 0);
			if (viewportWidth >= 768) {
				expect(header.x + header.width).toBeLessThan(gridBox.x);
				expect(gridBox.width).toBeGreaterThanOrEqual(300);
				expect(header.y).toBeLessThan(gridBox.y + gridBox.height);
			} else {
				expect(gridBox.y).toBeGreaterThan(header.y + header.height);
				expect(gridBox.width).toBeGreaterThan(viewportWidth * 0.75);
			}
		}
	}
});

test("custom-order actions are reachable before the process steps", async ({ page }) => {
	await page.goto("/#custom-orders");
	const section = page.locator("#custom-orders");
	const firstStep = section.getByRole("listitem").first();
	const actions = [
		section.getByRole("link", { name: "Start on WhatsApp", exact: true }),
		section.getByRole("link", { name: "Open the brief form", exact: true }),
	];
	for (const action of actions) {
		await expect(action).toBeVisible();
		expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
	}
	await expect(actions[0]!).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
	await expect(actions[1]!).toHaveAttribute("href", /^\/custom-orders\/?$/);
	if ((page.viewportSize()?.width ?? 0) < 768) {
		const stepBox = await firstStep.boundingBox();
		if (!stepBox) throw new Error("missing commission step");
		for (const action of actions) {
			const actionBox = await action.boundingBox();
			if (!actionBox) throw new Error("missing commission action");
			expect(actionBox.y + actionBox.height).toBeLessThan(stepBox.y);
		}
	}
});

test("the hero caption identifies the featured artwork and retains its accessible position", async ({ page }) => {
	await page.goto("/");
	const stage = page.locator("[data-shuffle-status]");
	await expect(stage).toHaveAttribute("data-shuffle-status", "applied");
	const artworkLink = stage.getByRole("link");
	const label = await artworkLink.getAttribute("aria-label");
	expect(label).toMatch(/^View .+/);
	await expect(stage.locator("p").first()).toHaveText(label!.replace(/^View /, ""));
	await expect(stage.locator("p").nth(1)).not.toBeEmpty();
	await expect(stage.getByText("Featured", { exact: false })).toBeVisible();
	await expect(stage.locator(".sr-only")).toHaveText(/, piece \d+ of \d+/);
	expect((await stage.locator(".sr-only").boundingBox())?.width).toBeLessThanOrEqual(1);
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
	const workshopCard = page.locator('#workshops a[href*="/workshops"][href*="#"]').first();
	await expect(workshopCard).toBeVisible();
	await workshopCard.click();
	await expect(page).toHaveURL(/\/workshops\/?#[\w-]+$/);

	await page.goto("/");
	const eventCard = page.locator('#events a[href*="/events"][href*="#"]').first();
	await eventCard.scrollIntoViewIfNeeded();
	await eventCard.click();
	await expect(page).toHaveURL(/\/events\/?#[\w-]+$/);
});

test("the hero offers artwork and custom orders as its two actions", async ({ page }) => {
	await page.goto("/");
	const hero = page.locator("main section").first();
	for (const [name, href] of [
		["See the artwork", /^\/work\/?$/],
		["Order a custom piece", /^\/custom-orders\/?$/],
	] as const) {
		const link = hero.getByRole("link", { name, exact: true });
		await expect(link).toHaveAttribute("href", href);
		expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
	}
	await expect(hero.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
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
