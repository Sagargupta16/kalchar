import { expect, test } from "@playwright/test";

test("artwork search combines with style filters and recovers from no results", async ({
	page,
}) => {
	await page.goto("/work/");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	const galleryLinks = page.locator("main li a[href^='/work/']");
	await expect(galleryLinks.first()).toBeVisible();
	const total = await galleryLinks.count();
	await search.fill("fish");
	await expect(galleryLinks).toHaveCount(2);
	await expect(page.getByText('2 pieces matching "fish"', { exact: true })).toBeVisible();

	await page.getByRole("button", { name: /^Pichwai/ }).click();
	await expect(page.getByText("No pieces found", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Clear search", exact: true }).click();
	await expect(search).toHaveValue("");
	await expect(search).toBeFocused();
	await expect(page.getByRole("button", { name: /^Pichwai/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(galleryLinks).toHaveCount(3);
	await page.getByRole("button", { name: /^All \d+$/ }).click();
	await expect(galleryLinks).toHaveCount(total);
});

test("clearing artwork search restores results and keeps keyboard focus", async ({ page }) => {
	await page.goto("/work/?view=available");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	const galleryLinks = page.locator("main li a[href^='/work/']");
	await expect(galleryLinks.first()).toBeVisible();
	const availableCount = await galleryLinks.count();
	await search.fill("no-matching-artwork");
	await expect(galleryLinks).toHaveCount(0);
	await page.getByRole("button", { name: "Clear artwork search" }).click();
	await expect(search).toBeFocused();
	await expect(galleryLinks).toHaveCount(availableCount);
	await expect(page).toHaveURL(/view=available/);
});

test("availability preserves the selected style and search", async ({ page }) => {
	await page.goto("/work/?style=Madhubani");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	const style = page.getByRole("button", { name: /^Madhubani/ });
	const available = page.getByRole("button", { name: "Available to buy", exact: true });
	const galleryLinks = page.locator("main li a[href^='/work/']");
	await search.fill("Radha");
	await available.click();
	await expect(page).toHaveURL(/style=Madhubani.*view=available/);
	await expect(style).toHaveAttribute("aria-pressed", "true");
	await expect(available).toHaveAttribute("aria-pressed", "true");
	await expect(search).toHaveValue("Radha");
	await expect(galleryLinks).toHaveCount(1);

	await page.getByRole("button", { name: /^Pichwai/ }).click();
	await expect(page).toHaveURL(/style=Pichwai.*view=available/);
	await expect(available).toHaveAttribute("aria-pressed", "true");
	await expect(galleryLinks).toHaveCount(0);
	await page.getByRole("button", { name: "Clear artwork search" }).click();
	await expect(
		page.getByText("No available pieces in this selection", { exact: true }),
	).toBeVisible();
	await available.click();
	await expect(page).toHaveURL(/style=Pichwai/);
	await expect(page).not.toHaveURL(/view=available/);
	await expect(galleryLinks).toHaveCount(3);
});

test("quick filter taps preserve both choices", async ({ page }) => {
	await page.goto("/work/");
	await page.getByRole("button", { name: /^Madhubani/ }).click();
	await page.getByRole("button", { name: "Available to buy", exact: true }).click();
	await expect(page.getByRole("button", { name: /^Madhubani/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(page).toHaveURL(/style=Madhubani.*view=available/);
	await expect(page.locator("main li a[href^='/work/']")).toHaveCount(1);
});

test("Back and Forward keep the filtered viewer collection", async ({ page }) => {
	await page.goto("/work/?style=Pichwai");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	await search.fill("Pichwai");
	const pieces = page.locator("main li a[href^='/work/']");
	await expect(pieces).toHaveCount(3);
	await pieces.first().click();
	const viewer = page.getByRole("dialog");
	await expect(viewer).toBeVisible();
	await expect(viewer.getByRole("button", { name: /^View / })).toHaveCount(3);
	await page.goBack();
	await expect(viewer).toHaveCount(0);
	await expect(search).toHaveValue("Pichwai");
	await expect(pieces.first()).toBeFocused();
	await page.goForward();
	await expect(viewer).toBeVisible();
	await expect(viewer.getByRole("button", { name: /^View / })).toHaveCount(3);
	await expect(page).toHaveURL(/style=Pichwai.*piece=/);
});

test("search accepts words in any order and style counts reflect the search", async ({ page }) => {
	await page.goto("/work/");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	await search.fill("  FISH   Madhubani  ");
	await expect(page.locator("main li a[href^='/work/']")).toHaveCount(2);
	await expect(page.getByRole("button", { name: "All 2", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Madhubani 2", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Pichwai 0", exact: true })).toBeVisible();
	await page.reload();
	await expect(search).toHaveValue("  FISH   Madhubani  ");
	await expect(page.locator("main li a[href^='/work/']")).toHaveCount(2);
});

test("empty-state recovery preserves context and returns focus to usable controls", async ({
	page,
}) => {
	await page.goto("/work/?style=Pichwai&ref=gallery#collection");
	const search = page.getByRole("searchbox", { name: "Find a piece you love" });
	const available = page.getByRole("button", { name: "Available to buy", exact: true });
	await search.fill("Pichwai");
	await available.click();
	await page.reload();
	await expect(search).toHaveValue("Pichwai");
	await expect(available).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Clear search", exact: true }).click();
	await expect(search).toBeFocused();
	await expect(page.getByRole("button", { name: /^Pichwai/ })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(available).toHaveAttribute("aria-pressed", "true");
	await expect(
		page.getByText("No available pieces in this selection", { exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Show all pieces", exact: true }).click();
	await expect(page.getByRole("button", { name: /^All \d+$/ })).toBeFocused();
	await expect(page.locator("main li a[href^='/work/']").first()).toBeVisible();
	const url = new URL(page.url());
	expect(url.searchParams.get("ref")).toBe("gallery");
	expect(url.searchParams.has("style")).toBe(false);
	expect(url.searchParams.has("view")).toBe(false);
	expect(url.searchParams.has("q")).toBe(false);
	expect(url.hash).toBe("#collection");
});

test("cards preserve modified link actions and keyboard viewer focus", async ({ page }) => {
	await page.goto("/work/");
	const card = page.locator("main li a[href^='/work/']").first();
	await expect(card).toBeVisible();
	const intercepted = await card.evaluate((element) =>
		["shiftKey", "altKey", "ctrlKey", "metaKey"].map((modifier) => {
			let prevented = false;
			document.addEventListener(
				"click",
				(event) => {
					prevented = event.defaultPrevented;
					// Observe the React handler, then cancel the browser action to keep this test in one tab.
					event.preventDefault();
				},
				{ once: true },
			);
			element.dispatchEvent(
				new MouseEvent("click", {
					bubbles: true,
					cancelable: true,
					[modifier]: true,
				}),
			);
			return prevented;
		}),
	);
	expect(intercepted).toEqual([false, false, false, false]);
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(card).toHaveAccessibleDescription(/^Piece \d+ of \d+$/);
	await card.focus();
	await card.press("Enter");
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(card).toBeFocused();
});
