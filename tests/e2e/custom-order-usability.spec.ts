import { expect, type Page, test } from "@playwright/test";
import { mountCustomOrder, returnToCustomOrder } from "../forms/browser-fixture";

const continueButton = (page: Page) =>
	page.getByRole("button", { name: "Continue to WhatsApp", exact: true });
const whatsapp = (page: Page) => page.locator('form a[href^="https://wa.me/"]');
const submissions = (page: Page) => page.evaluate(() => window.customOrderTest.submissions);

test("an unfinished brief and its optional choices survive leaving and returning", async ({
	page,
}) => {
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A lotus pond for our hallway");
	await page.getByLabel("Your name").fill("A visitor");
	await page.getByLabel("Email or WhatsApp number").fill("visitor@example.invalid");
	for (const choice of ["Warli / custom style", "Medium", "Under 5,000", "Within a month"]) {
		await page.getByText(choice, { exact: true }).click();
	}

	await returnToCustomOrder(page);

	await expect(page.getByLabel("What would you like painted?")).toHaveValue(
		"A lotus pond for our hallway",
	);
	await expect(page.getByLabel("Your name")).toHaveValue("A visitor");
	await expect(page.getByLabel("Email or WhatsApp number")).toHaveValue("visitor@example.invalid");
	for (const choice of ["Warli / custom style", "Medium", "Under 5,000", "Within a month"]) {
		await expect(page.getByLabel(choice, { exact: true })).toBeChecked();
	}
	await expect(continueButton(page)).toBeVisible();
	expect(await submissions(page)).toEqual([]);
});

test("returning to a saved brief keeps its handoff links without submitting again", async ({
	page,
}) => {
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A forest scene");
	await continueButton(page).click();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	const originalHref = await whatsapp(page).getAttribute("href");

	await returnToCustomOrder(page);

	await expect(whatsapp(page)).toHaveAttribute("href", originalHref!);
	await expect(whatsapp(page)).not.toBeFocused();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	expect(await submissions(page)).toHaveLength(1);
	await page.getByLabel("What would you like painted?").fill("A different forest scene");
	await expect(whatsapp(page)).toHaveCount(0);
	await expect(continueButton(page)).toBeVisible();
});

test("large preset lists contain one neutral choice and no blank or duplicate options", async ({
	page,
}) => {
	await mountCustomOrder(page, {
		budgets: [
			"Open / not sure",
			"",
			"Under 1,000",
			"Under 2,000",
			"Under 3,000",
			"Under 4,000",
			"Under 5,000",
			"Under 6,000",
			"Under 7,000",
			" under 1,000 ",
		],
	});
	const budget = page.getByRole("combobox", { name: "Budget" });
	await expect(budget.getByRole("option")).toHaveCount(8);
	await expect(budget.getByRole("option", { name: "Open / not sure", exact: true })).toHaveCount(1);
	await budget.selectOption("Under 7,000");
	await page.getByLabel("What would you like painted?").fill("A painting for a gift");
	await continueButton(page).click();
	const message = new URL((await whatsapp(page).getAttribute("href"))!).searchParams.get("text");
	expect(message).toContain("Budget: Under 7,000");
});

test("the name and reply contact use the same length limit as the saved lead", async ({ page }) => {
	await mountCustomOrder(page);
	for (const label of ["Your name", "Email or WhatsApp number"]) {
		await expect(page.getByLabel(label)).toHaveAttribute("maxlength", "200");
	}
	await page.getByLabel("Your name").fill("N".repeat(210));
	await expect(page.getByLabel("Your name")).toHaveValue("N".repeat(200));
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await continueButton(page).click();
	expect(await submissions(page)).toEqual([expect.objectContaining({ name: "N".repeat(200) })]);
	const message = new URL((await whatsapp(page).getAttribute("href"))!).searchParams.get("text");
	expect(message).toContain(`From: ${"N".repeat(200)}\n`);
});

test("blank validation focuses the idea and only clears when that field is corrected", async ({
	page,
}) => {
	await mountCustomOrder(page);
	const brief = page.getByLabel("What would you like painted?");
	await brief.fill("   ");
	await continueButton(page).click();
	await expect(brief).toBeFocused();
	await expect(brief).toHaveAttribute("aria-invalid", "true");
	await page.getByLabel("Your name").fill("A visitor");
	await expect(page.getByRole("alert")).toContainText("Tell us a bit");
	expect(await submissions(page)).toEqual([]);
	await brief.fill("A lotus painting");
	await expect(page.getByRole("alert")).toHaveCount(0);
});

test("keyboard style selection reaches the saved lead and handoff message", async ({ page }) => {
	await mountCustomOrder(page);
	const openStyle = page.getByLabel("Open to suggestion", { exact: true });
	await openStyle.focus();
	await page.keyboard.press("ArrowLeft");
	await expect(page.getByLabel("Warli / custom style", { exact: true })).toBeChecked();
	await page.getByLabel("What would you like painted?").fill("A blue and gold peacock");
	await continueButton(page).click();
	await expect(whatsapp(page)).toBeFocused();
	expect(await submissions(page)).toEqual([
		expect.objectContaining({ style: "Warli / custom style" }),
	]);
	const message = new URL((await whatsapp(page).getAttribute("href"))!).searchParams.get("text");
	expect(message).toContain("Style: Warli / custom style");
});

test("failed saves retain both handoff paths and can be retried", async ({ page }) => {
	await mountCustomOrder(page);
	await page.evaluate(() => {
		window.customOrderTest.outcome = "failed";
	});
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await continueButton(page).click();
	await expect(page.getByRole("alert")).toContainText("couldn’t confirm");
	await expect(whatsapp(page)).toBeVisible();
	await expect(page.getByRole("link", { name: "Or email instead" })).toHaveAttribute(
		"href",
		/^mailto:/,
	);
	await page.evaluate(() => {
		window.customOrderTest.outcome = "saved";
	});
	await page.getByRole("button", { name: "Try saving again" }).click();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
	expect(await submissions(page)).toHaveLength(2);
});

test("editing while a save is pending cannot mark the newer idea as saved", async ({ page }) => {
	await mountCustomOrder(page);
	await page.evaluate(() => {
		window.customOrderTest.outcome = "pending";
	});
	const brief = page.getByLabel("What would you like painted?");
	await brief.fill("The original idea");
	await continueButton(page).click();
	await expect(page.getByText("Saving your brief.", { exact: false })).toBeVisible();
	await brief.fill("The updated idea");
	await page.evaluate(() => window.customOrderTest.release?.());
	await expect(continueButton(page)).toBeVisible();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
	await expect(whatsapp(page)).toHaveCount(0);
});

test("reloading restores the brief without automatically saving it", async ({ page }) => {
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A lotus painting for a birthday");
	await page.getByText("Medium", { exact: true }).click();
	await mountCustomOrder(page);
	await expect(page.getByLabel("What would you like painted?")).toHaveValue(
		"A lotus painting for a birthday",
	);
	await expect(page.getByLabel("Medium", { exact: true })).toBeChecked();
	expect(await submissions(page)).toEqual([]);
});

test("an interrupted save restores an honest status and keeps handoff links available", async ({
	page,
}) => {
	await mountCustomOrder(page);
	await page.evaluate(() => {
		window.customOrderTest.outcome = "pending";
	});
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await continueButton(page).click();
	await expect(page.getByText("Saving your brief.", { exact: false })).toBeVisible();
	await returnToCustomOrder(page);
	await expect(page.getByRole("alert")).toContainText("couldn’t confirm");
	await expect(whatsapp(page)).toBeVisible();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toHaveCount(0);
	expect(await submissions(page)).toHaveLength(1);
});

test("restored choices stay visible when catalog styles or preset capitalization change", async ({
	page,
}) => {
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await page.getByText("Warli / custom style", { exact: true }).click();
	await page.getByText("Under 5,000", { exact: true }).click();
	await returnToCustomOrder(page, {
		availableStyles: ["Madhubani"],
		budgets: ["under 5,000", "Open / not sure"],
	});
	await expect(page.getByLabel("Warli / custom style", { exact: true })).toBeChecked();
	const selectedBudget = page
		.getByRole("group", { name: "Budget" })
		.getByRole("radio", { checked: true });
	await expect(selectedBudget).toHaveValue("Under 5,000");
	await continueButton(page).click();
	expect(await submissions(page)).toEqual([
		expect.objectContaining({ style: "Warli / custom style", budget: "Under 5,000" }),
	]);
});

test("only distinct non-neutral presets count toward the chip limit", async ({ page }) => {
	await mountCustomOrder(page, {
		sizes: ["Small", "Medium", "Large", "Tall", "Wide", "Square", "No preference", " small ", ""],
	});
	const size = page.getByRole("group", { name: "Approximate size" });
	await expect(size.getByRole("radio")).toHaveCount(7);
	await expect(size.getByRole("radio", { checked: true })).toHaveValue("");
	await expect(page.getByRole("combobox", { name: "Approximate size" })).toHaveCount(0);
});

test("the form still validates and prepares a message when tab storage is unavailable", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, "sessionStorage", {
			get() {
				throw new DOMException("Storage is unavailable", "SecurityError");
			},
		});
	});
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await continueButton(page).click();
	await expect(whatsapp(page)).toBeVisible();
	await expect(page.getByText("Your enquiry is saved.", { exact: true })).toBeVisible();
});

test("the optional-details shortcut moves keyboard focus to the next action", async ({ page }) => {
	await mountCustomOrder(page);
	await page.getByLabel("What would you like painted?").fill("A lotus painting");
	await page.getByRole("link", { name: "Skip optional details" }).focus();
	await page.keyboard.press("Enter");
	await expect(continueButton(page)).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(whatsapp(page)).toBeFocused();
});
