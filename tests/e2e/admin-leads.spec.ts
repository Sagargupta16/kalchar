import { expect, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

// Tier 2a (visual-direction-admin): the enquiries DM inbox. Phone flows run at
// 390; the split pane explicitly uses desktop settings in either root project.
// The lead cases that lived in admin-settings.spec.ts and admin-components.spec.ts
// moved here when the card became a row + sheet.

test.describe("enquiries inbox at 390", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("rows carry the initials disc, the quiet unread signal, one snippet line and the short date", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		const priya = page.getByRole("button", { name: /^Priya Sharma/ });
		await expect(priya).toHaveAccessibleName(/, new/);
		await expect(priya.locator("span").first()).toHaveText("PS");
		await expect(priya.locator(".truncate.font-semibold")).toHaveText("Priya Sharma");
		await expect(priya).toContainText(
			'Gond, 24 x 36 in, INR 10k to 20k, 2 to 3 weeks, "I would like a large Gond piece',
		);
		await expect(priya.locator(".w-14")).toHaveText("2h");
		const rahul = page.getByRole("button", { name: /^Rahul Mehta/ });
		await expect(rahul).not.toHaveAccessibleName(/, new/);
		await expect(rahul.locator(".truncate.font-medium")).toHaveText("Rahul Mehta");
		await expect(rahul.locator(".w-14")).toHaveText(/^[A-Z][a-z]{2}$/);
		const anonymous = page.getByRole("button", { name: /^Someone/ });
		await expect(anonymous).toHaveAccessibleName(/, new/);
		await expect(anonymous.locator("span").first()).toHaveText("S");
		await expect(anonymous.locator(".w-14")).toHaveText("30m");
	});

	test("a row opens the sheet; a status flip applies, closes it and raises the Undo toast", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();
		const group = dialog.getByRole("radiogroup", {
			name: "Status of the enquiry from Priya Sharma",
		});
		await expect(group.getByRole("radio", { name: "New" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await group.getByRole("radio", { name: "Contacted" }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.getByText("Enquiry from Priya Sharma marked contacted")).toBeVisible();
		await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).not.toHaveAccessibleName(
			/, new/,
		);
	});

	test("Undo runs the reverse action once, Dismiss calls nothing, a rejected undo keeps the bar", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		const bar = page.locator(".fixed");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await page.getByRole("dialog").getByRole("radio", { name: "Contacted" }).click();
		await expect(bar.getByText("Enquiry from Priya Sharma marked contacted")).toBeVisible();
		await bar.getByRole("button", { name: "Undo" }).click();
		await expect(bar).toHaveCount(0);
		const afterUndo = (await page.evaluate(() => window.adminTest.calls)).at(-1);
		expect(afterUndo?.name).toBe("setLeadStatus");
		expect(afterUndo?.args).toEqual(["lead-priya", "new"]);
		// Dismiss leaves the offer without calling anything.
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await page.getByRole("dialog").getByRole("radio", { name: "Closed" }).click();
		await expect(bar.getByText("Enquiry from Priya Sharma marked closed")).toBeVisible();
		const count = await page.evaluate(() => window.adminTest.calls.length);
		await bar.getByRole("button", { name: "Dismiss" }).click();
		await expect(bar).toHaveCount(0);
		expect(await page.evaluate(() => window.adminTest.calls.length)).toBe(count);
		// A rejected undo reports inside the bar and the bar stays.
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await page.getByRole("dialog").getByRole("radio", { name: "New" }).click();
		await expect(bar.getByText("Enquiry from Priya Sharma marked new")).toBeVisible();
		await outcome(page, "failure");
		await bar.getByRole("button", { name: "Undo" }).click();
		await expect(bar.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(bar).toHaveCount(1);
	});

	test("the status radios name every state in words", async ({ page }) => {
		await mountAdmin(page, "leadsInbox");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await expect(page.getByRole("dialog").getByRole("radio")).toHaveText([
			"New",
			"Contacted",
			"Closed",
		]);
	});

	test("Reply on WhatsApp prefills the greeting and marks a new enquiry contacted", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.context().route("https://wa.me/**", (route) => route.fulfill({ body: "" }));
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const reply = page.getByRole("dialog").getByRole("link", { name: "Reply on WhatsApp" });
		await expect(reply).toHaveAttribute(
			"href",
			/^https:\/\/wa\.me\/919876543210\?text=Hi%20Priya%20Sharma%2C/,
		);
		const popup = page.waitForEvent("popup");
		await reply.click();
		await (await popup).close();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).not.toHaveAccessibleName(
			/, new/,
		);
	});

	test("an email-only enquiry offers Copy email and keeps the full timestamp and contact", async ({
		page,
	}) => {
		await mountAdmin(page, "leads");
		await page.getByRole("button", { name: /^Mira/ }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByRole("link", { name: "Reply on WhatsApp" })).toHaveCount(0);
		// Fixture createdAt "2026-09-01" parses as UTC midnight, 05:30 IST; the
		// month prefix covers ICU printing "Sep" or "Sept" for en-IN.
		await expect(dialog.getByText(/Received 1 Sep\w* 2026, 05:30 am/)).toBeVisible();
		await expect(dialog.getByText("Contact: mira@example.invalid")).toBeVisible();
		await dialog.getByRole("button", { name: "Copy email", exact: true }).click();
		await expect(dialog.getByRole("button", { name: "Email copied", exact: true })).toBeVisible();
	});

	for (const failure of ["failure", "throw"] as const) {
		const message = failure === "failure" ? "Change was rejected." : "Connection interrupted.";

		test(`a status change survives a ${failure}: the error reports inside the sheet and New holds`, async ({
			page,
		}) => {
			await mountAdmin(page, "leadsInbox");
			await outcome(page, failure);
			await page.getByRole("button", { name: /^Priya Sharma/ }).click();
			const dialog = page.getByRole("dialog");
			await dialog.getByRole("radio", { name: "Contacted" }).click();
			await expect(dialog.getByRole("alert")).toHaveText(message);
			await expect(dialog.getByRole("radio", { name: "New" })).toHaveAttribute(
				"aria-checked",
				"true",
			);
			expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(0);
		});

		test(`delete confirms inline and a ${failure} preserves the enquiry`, async ({ page }) => {
			await mountAdmin(page, "leadsInbox");
			await outcome(page, failure);
			await page.getByRole("button", { name: /^Priya Sharma/ }).click();
			const dialog = page.getByRole("dialog");
			await dialog.getByRole("button", { name: "Delete enquiry from Priya Sharma" }).click();
			await expect(
				dialog.getByRole("heading", { name: "Delete enquiry from Priya Sharma?" }),
			).toBeVisible();
			for (const banned of ["Cancel", "OK", "Yes"]) {
				await expect(dialog.getByRole("button", { name: banned, exact: true })).toHaveCount(0);
			}
			await dialog.getByRole("button", { name: "Delete enquiry", exact: true }).click();
			await expect(dialog.getByRole("alert")).toHaveText(message);
			await dialog.getByRole("button", { name: "Keep enquiry", exact: true }).click();
			await dialog.getByRole("button", { name: "Close", exact: true }).click();
			await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toBeVisible();
			expect(await page.evaluate(() => window.adminTest.refreshes)).toBe(0);
		});
	}

	test("a confirmed delete removes the row and closes the sheet", async ({ page }) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Delete enquiry from Priya Sharma" }).click();
		await dialog.getByRole("button", { name: "Delete enquiry", exact: true }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toHaveCount(0);
	});

	test("deleting the last enquiry shows the blank slate only after success", async ({ page }) => {
		await mountAdmin(page, "leads");
		await page.getByRole("button", { name: /^Mira/ }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Delete enquiry from Mira" }).click();
		await dialog.getByRole("button", { name: "Delete enquiry", exact: true }).click();
		await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(page.getByText("No enquiries yet")).toHaveCount(0);
		await outcome(page, "success");
		await dialog.getByRole("button", { name: "Delete enquiry", exact: true }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		await expect(page.getByText("No enquiries yet")).toBeVisible();
		await expect(page.getByRole("alert")).toHaveCount(0);
	});

	test("filter chips: New carries its count, the rest stay plain, Closed empty offers Show all", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		const group = page.getByRole("group", { name: "Filter enquiries" });
		for (const name of ["New 2", "Contacted", "Closed", "All"]) {
			await expect(group.getByRole("button", { name, exact: true })).toBeVisible();
		}
		await expect(group.getByRole("button", { name: "All", exact: true })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await group.getByRole("button", { name: "Closed", exact: true }).click();
		await expect(page.getByText("No closed enquiries on this page.")).toBeVisible();
		await page.getByRole("button", { name: "Show all" }).click();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toBeVisible();
	});

	test("empty states: blank slate and All caught up", async ({ page }) => {
		await mountAdmin(page, "leadsEmpty");
		await expect(page.getByText("No enquiries yet")).toBeVisible();
		await expect(page.getByText("New enquiries from the site appear here.")).toBeVisible();
		await mountAdmin(page, "leadsCaughtUp");
		await page
			.getByRole("group", { name: "Filter enquiries" })
			.getByRole("button", { name: "New 0", exact: true })
			.click();
		await expect(page.getByText("All caught up")).toBeVisible();
	});
});

test.describe("enquiries split pane at desktop", () => {
	test.use({ viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false });

	test("selecting renders the enquiry inline with no sheet, marks the row and sets ?lead=", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await expect(
			pane.getByRole("radiogroup", { name: "Status of the enquiry from Priya Sharma" }),
		).toBeVisible();
		await expect(pane.getByText(/I would like a large Gond piece/)).toBeVisible();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toHaveClass(
			/border-accent/,
		);
		expect(await page.evaluate(() => window.location.search)).toContain("lead=lead-priya");
		await page.getByRole("button", { name: /^Rahul Mehta/ }).click();
		await expect(page.getByRole("region", { name: "Enquiry from Rahul Mehta" })).toBeVisible();
		expect(await page.evaluate(() => window.location.search)).toContain("lead=lead-rahul");
	});

	test("a status flip from the pane keeps it open and raises the toast", async ({ page }) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await pane.getByRole("radio", { name: "Contacted" }).click();
		await expect(pane).toBeVisible();
		await expect(page.getByText("Enquiry from Priya Sharma marked contacted")).toBeVisible();
		await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
	});
});
