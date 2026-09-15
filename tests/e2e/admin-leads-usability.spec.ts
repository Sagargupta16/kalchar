import { expect, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

async function releaseAction(page: Page, result: "success" | "failure" | "throw") {
	await page.evaluate((next) => {
		window.adminTest.outcome = next;
		window.adminTest.release?.();
	}, result);
}

test.describe("enquiries desktop usability", () => {
	test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

	test("Undo restores the visible status and count without waiting for a refreshed page", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await pane.getByRole("radio", { name: "Contacted" }).click();
		await expect(pane.getByRole("radio", { name: "Contacted" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await page.getByRole("button", { name: "Undo", exact: true }).click();
		await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
		await expect(pane.getByRole("radio", { name: "New", exact: true })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await expect(page.getByRole("button", { name: "New 2", exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toHaveAccessibleName(/, new/);
	});

	test("the last matching enquiry stays readable during a pending status change and rejection", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		const filters = page.getByRole("group", { name: "Filter enquiries" });
		await filters.getByRole("button", { name: "Contacted", exact: true }).click();
		await page.getByRole("button", { name: /^Rahul Mehta/ }).click();
		await outcome(page, "pending");
		const pane = page.getByRole("region", { name: "Enquiry from Rahul Mehta" });
		await pane.getByRole("radio", { name: "Closed", exact: true }).click();
		await expect(pane).toBeVisible();
		await expect(pane.getByRole("radio", { name: "Closed", exact: true })).toBeDisabled();
		await expect(filters.getByRole("button", { name: "All", exact: true })).toBeDisabled();
		await expect(page.getByText("No contacted enquiries on this page.")).toHaveCount(0);
		await releaseAction(page, "failure");
		await expect(pane.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(pane.getByRole("radio", { name: "Contacted" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
	});

	test("pending Undo blocks another reply mutation and rejection keeps the saved status", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await page.context().route("https://wa.me/**", (route) => route.abort());
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await pane.getByRole("radio", { name: "Contacted" }).click();
		await outcome(page, "pending");
		await page.getByRole("button", { name: "Undo", exact: true }).click();
		const reply = pane.getByRole("link", { name: "Reply on WhatsApp" });
		await expect(reply).toHaveAttribute("aria-disabled", "true");
		await expect(reply).toHaveAttribute("tabindex", "-1");
		expect(
			await reply.evaluate(
				(link) => !link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })),
			),
		).toBe(true);
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([
			{ name: "setLeadStatus", args: ["lead-priya", "contacted"] },
			{ name: "setLeadStatus", args: ["lead-priya", "new"] },
		]);
		await releaseAction(page, "failure");
		await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
		await expect(pane.getByRole("radio", { name: "Contacted" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await expect(page.getByRole("button", { name: "New 1", exact: true })).toBeVisible();
		await expect(reply).not.toHaveAttribute("aria-disabled", "true");
	});

	test("a successful filtered status change clears the hidden selection and Undo restores its row", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: "New 2", exact: true }).click();
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await page
			.getByRole("region", { name: "Enquiry from Priya Sharma" })
			.getByRole("radio", { name: "Contacted" })
			.click();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toHaveCount(0);
		await expect(page.getByRole("region", { name: "Enquiry from Priya Sharma" })).toHaveCount(0);
		expect(await page.evaluate(() => window.location.search)).not.toContain("lead=");
		await page.getByRole("button", { name: "Undo", exact: true }).click();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toBeVisible();
		await expect(page.getByRole("button", { name: "New 2", exact: true })).toBeVisible();
	});

	test("deleting an enquiry clears its old status Undo offer", async ({ page }) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await pane.getByRole("radio", { name: "Contacted" }).click();
		await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
		await pane.getByRole("button", { name: "Delete enquiry from Priya Sharma" }).click();
		await pane.getByRole("button", { name: "Delete enquiry", exact: true }).click();
		await expect(page.getByRole("button", { name: /^Priya Sharma/ })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
	});

	test("leaving a rejected enquiry keeps its error visible even after an earlier Undo offer", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await outcome(page, "success");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		await page
			.getByRole("region", { name: "Enquiry from Priya Sharma" })
			.getByRole("radio", { name: "Contacted" })
			.click();
		await page.getByRole("button", { name: /^Rahul Mehta/ }).click();
		await outcome(page, "failure");
		await page
			.getByRole("region", { name: "Enquiry from Rahul Mehta" })
			.getByRole("radio", { name: "Closed" })
			.click();
		await page.getByRole("button", { name: /^Someone/ }).click();
		await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	});

	test("Keep enquiry returns keyboard focus to the delete trigger", async ({ page }) => {
		await mountAdmin(page, "leadsInbox");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const pane = page.getByRole("region", { name: "Enquiry from Priya Sharma" });
		await pane.getByRole("button", { name: "Delete enquiry from Priya Sharma" }).click();
		const keep = pane.getByRole("button", { name: "Keep enquiry", exact: true });
		await expect(keep).toBeFocused();
		await keep.press("Enter");
		await expect(
			pane.getByRole("button", { name: "Delete enquiry from Priya Sharma" }),
		).toBeFocused();
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
	});
});

test.describe("enquiries phone usability", () => {
	test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

	test("Escape and Close keep a pending delete confirmation open until its result", async ({
		page,
	}) => {
		await mountAdmin(page, "leadsInbox");
		await page.getByRole("button", { name: /^Priya Sharma/ }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Delete enquiry from Priya Sharma" }).click();
		await outcome(page, "pending");
		await dialog.getByRole("button", { name: "Delete enquiry", exact: true }).click();
		await page.keyboard.press("Escape");
		await expect(
			dialog.getByRole("heading", { name: "Delete enquiry from Priya Sharma?" }),
		).toBeVisible();
		await dialog.getByRole("button", { name: "Close", exact: true }).click();
		await expect(
			dialog.getByRole("heading", { name: "Delete enquiry from Priya Sharma?" }),
		).toBeVisible();
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([
			{ name: "deleteLead", args: ["lead-priya"] },
		]);
		await releaseAction(page, "failure");
		await expect(dialog.getByRole("alert")).toHaveText("Change was rejected.");
		await dialog.getByRole("button", { name: "Keep enquiry", exact: true }).click();
		await expect(
			dialog.getByRole("button", { name: "Delete enquiry from Priya Sharma" }),
		).toBeFocused();
	});

	test("a rejected clipboard write preserves the address and keyboard focus for a retry", async ({
		page,
	}) => {
		await mountAdmin(page, "leads");
		await page.evaluate(() => {
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: {
					writeText: async () => {
						throw new Error("Permission denied");
					},
				},
			});
		});
		await page.getByRole("button", { name: /^Mira/ }).click();
		const dialog = page.getByRole("dialog");
		const copy = dialog.getByRole("button", { name: "Copy email", exact: true });
		await copy.focus();
		await copy.press("Enter");
		await expect(dialog.getByRole("alert")).toHaveText(
			"Could not copy the email. Select the address below, then use your device's Copy command.",
		);
		await expect(dialog.getByText("Contact: mira@example.invalid")).toBeVisible();
		await expect(copy).toBeFocused();
		const address = dialog.getByRole("textbox", { name: "Email address to copy", exact: true });
		await expect(address).toHaveValue("mira@example.invalid");
		await expect(address).toHaveAttribute("readonly", "");
		const selection = () =>
			address.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]);
		await address.focus();
		await expect.poll(selection).toEqual([0, "mira@example.invalid".length]);
		await address.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 4));
		await address.tap();
		await expect.poll(selection).toEqual([0, "mira@example.invalid".length]);
		const copied = await page.evaluateHandle(() => {
			const writes: string[] = [];
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: {
					writeText: async (text: string) => {
						writes.push(text);
					},
				},
			});
			return writes;
		});
		await copy.focus();
		await copy.press("Enter");
		await expect(dialog.getByRole("button", { name: "Email copied", exact: true })).toBeFocused();
		await expect(dialog.getByRole("alert")).toHaveCount(0);
		await expect(address).toHaveCount(0);
		expect(await copied.jsonValue()).toEqual(["mira@example.invalid"]);
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
	});
});
