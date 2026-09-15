import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const fixtureImage = (name: string) => ({
	name,
	mimeType: "image/jpeg",
	buffer: Buffer.from(`isolated upload fixture ${name}`),
});

async function choosePhoto(page: Page) {
	await page.locator('input[name="image"]').setInputFiles(fixtureImage("lotus.jpg"));
	await expect(page.getByRole("heading", { name: "Give it a name" })).toBeVisible();
}

async function fillTitle(page: Page) {
	await page.getByLabel("Title *", { exact: true }).fill("Lotus garden");
}

const publish = (page: Page) => page.getByRole("button", { name: "Publish piece", exact: true });

const warnsBeforeReload = (page: Page) =>
	page.evaluate(() => {
		const event = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(event);
		return event.defaultPrevented;
	});

test("visible photo chooser opens the picker and decodes the selected artwork", async ({ page }) => {
	await mountAdmin(page, "upload");
	const chooserPromise = page.waitForEvent("filechooser");
	await page.getByRole("button", { name: "Choose a photo" }).click();
	const chooser = await chooserPromise;
	expect(chooser.isMultiple()).toBe(false);
	await chooser.setFiles(resolve("public/artworks/twin-fish.jpg"));

	await expect(page.getByRole("heading", { name: "Give it a name" })).toBeVisible();
	await expect(page.getByText("twin-fish.jpg", { exact: true })).toBeVisible();
	const preview = page.getByRole("img", { name: "Preview of the selected artwork" });
	await expect(preview).toBeVisible();
	const dimensions = await preview.evaluate(async (image: HTMLImageElement) => {
		await image.decode();
		return { width: image.naturalWidth, height: image.naturalHeight };
	});
	expect(dimensions.width).toBeGreaterThan(0);
	expect(dimensions.height).toBeGreaterThan(0);
	await expect(page.getByText("Photo uploaded.", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual(["twin-fish.jpg"]);
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("choosing a photo opens details directly and gates publishing on required fields", async ({ page }) => {
	await mountAdmin(page, "upload");
	expect(await warnsBeforeReload(page)).toBe(false);
	await expect(page.getByRole("button", { name: "Choose a photo" })).toBeVisible();
	await expect(page.getByText("JPG, PNG, or WebP up to 20 MB")).toBeVisible();
	await expect(page.getByLabel("Title *", { exact: true })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Continue to details" })).toHaveCount(0);
	await choosePhoto(page);
	expect(await warnsBeforeReload(page)).toBe(true);
	await expect(page.getByText("Fields marked * are required.")).toBeVisible();
	await expect(page.locator("form img")).toBeAttached();
	await expect(page.getByRole("button", { name: "Change photo" })).toBeVisible();
	await expect(page.getByText("Photo uploaded.", { exact: true })).toBeVisible();
	await expect(publish(page)).toBeDisabled();
	await expect(publish(page)).toHaveAccessibleDescription("Add a title to publish.");
	await fillTitle(page);
	await expect(publish(page)).toBeEnabled();
	await outcome(page, "success");
	await publish(page).click();
	await expect(page.getByRole("heading", { name: "Your piece is live" })).toBeVisible();
	expect(await warnsBeforeReload(page)).toBe(false);
	const output = page.locator("output");
	await expect(output).toContainText('Added "Lotus garden" to the gallery');
	await expect(output.getByRole("link", { name: "View" })).toHaveAttribute("href", "/work/created-piece/");
	await output.getByRole("button", { name: "Add another" }).click();
	await expect(page.getByRole("button", { name: "Choose a photo" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Continue to details" })).toHaveCount(0);
});

test("publish failure keeps the photo and every field for a retry", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	await fillTitle(page);
	await page.getByLabel("Price (optional)", { exact: true }).fill("1200");
	await page.getByText("More details", { exact: true }).click();
	await page.getByLabel("Year (optional)", { exact: true }).fill("2026");
	await page.getByLabel("Dimensions (optional)", { exact: true }).fill("30 x 40 cm");
	await page.getByLabel("Description (optional)", { exact: true }).fill("Hand-painted lotus flowers.");
	await outcome(page, "failure");
	await publish(page).click();
	await expect(page.getByRole("alert")).toContainText("Change was rejected.");
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Lotus garden");
	await page.getByRole("button", { name: "Back", exact: true }).click();
	await page.getByRole("button", { name: "Continue to details" }).click();
	await expect(page.getByLabel("Description (optional)", { exact: true })).toHaveValue("Hand-painted lotus flowers.");
	await outcome(page, "success");
	await page.getByRole("button", { name: "Retry publish" }).click();
	await expect(page.getByRole("heading", { name: "Your piece is live" })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual(["lotus.jpg"]);
	const submissions = await page.evaluate(() => window.adminTest.formSubmissions);
	expect(submissions).toHaveLength(2);
	expect(submissions[1]).toEqual({
		title: "Lotus garden", style: "Gond", medium: "Ink", priceInr: "1200", year: "2026",
		dimensions: "30 x 40 cm", description: "Hand-painted lotus flowers.", imageKey: "staging/fixture",
	});
});

test("publishing is indeterminate and locks photo, details, and Back until complete", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	await fillTitle(page);
	await outcome(page, "pending");
	await publish(page).click();
	const busy = page.getByRole("button", { name: "Publishing…", exact: true });
	await expect(busy).toHaveAttribute("aria-busy", "true");
	await expect(busy).toBeDisabled();
	await expect(page.getByRole("button", { name: "Back", exact: true })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Change photo" })).toBeDisabled();
	await expect(page.getByLabel("Title *", { exact: true })).toBeDisabled();
	await expect(page.getByRole("progressbar")).toHaveCount(1);
	await expect(page.getByRole("progressbar")).not.toHaveAttribute("value");
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("heading", { name: "Your piece is live" })).toBeVisible();
});

test("category is a single-select chip rail with the last-used preselected", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	const rail = page.getByRole("group", { name: "Category" });
	await expect(rail.getByRole("button", { name: "Gond" })).toHaveAttribute("aria-pressed", "true");
	await rail.getByRole("button", { name: "Pichwai" }).click();
	await expect(rail.getByRole("button", { name: "Pichwai" })).toHaveAttribute("aria-pressed", "true");
	await expect(rail.getByRole("button", { name: "Gond" })).toHaveAttribute("aria-pressed", "false");
});

test("numeric fields keep digits only and optional fields stay collapsed", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	const price = page.getByLabel("Price (optional)", { exact: true });
	await price.fill("1,200");
	await expect(price).toHaveValue("1200");
	await expect(page.getByText("Shows as INR 1,200")).toBeVisible();
	await expect(price).toHaveAttribute("inputmode", "numeric");
	await expect(page.getByLabel("Year (optional)", { exact: true })).not.toBeVisible();
	await page.getByText("More details", { exact: true }).click();
	await expect(page.getByLabel("Year (optional)", { exact: true })).toHaveAttribute("inputmode", "numeric");
});

test("details prefill medium and offer datalist suggestions", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	const medium = page.getByRole("combobox", { name: "Medium *" });
	await expect(medium).toHaveValue("Ink");
	await expect(medium).toHaveAttribute("required", "");
	const options = async (field: Locator) => field.evaluate((input: HTMLInputElement) => input.list?.options.length ?? -1);
	expect(await options(medium)).toBe(2);
	await page.getByText("More details", { exact: true }).click();
	expect(await options(page.getByRole("combobox", { name: "Dimensions (optional)" }))).toBe(1);
});

test("empty categories point at Categories and prevent publishing", async ({ page }) => {
	await mountAdmin(page, "uploadEmpty");
	await choosePhoto(page);
	await expect(page.getByRole("link", { name: "Add one in Categories" })).toBeVisible();
	await expect(publish(page)).toBeDisabled();
	await expect(publish(page)).toHaveAccessibleDescription("Add a title, a category, and a medium to publish.");
});

test("photo upload progress follows reported bytes while details remain editable", async ({ page }) => {
	await mountAdmin(page, "upload");
	await page.evaluate(() => { window.adminTest.stageOutcome = "pending"; });
	await choosePhoto(page);
	await fillTitle(page);
	await expect(publish(page)).toBeDisabled();
	await expect(publish(page)).toHaveAccessibleDescription("Your photo is still uploading.");
	await page.evaluate(() => window.adminTest.stageRequests[0]!.progress(0.42));
	await expect(page.getByRole("progressbar")).toHaveAttribute("value", "42");
	await page.evaluate(() => window.adminTest.stageRequests[0]!.complete("staging/lotus"));
	await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
	await expect(publish(page)).toBeEnabled();
});

test("photo retry retains the draft and stages only when requested", async ({ page }) => {
	await mountAdmin(page, "upload");
	await page.evaluate(() => { window.adminTest.stageOutcome = "failure"; });
	await choosePhoto(page);
	await fillTitle(page);
	await expect(page.getByRole("alert")).toContainText("Photo upload interrupted.");
	await expect(publish(page)).toBeDisabled();
	await page.evaluate(() => { window.adminTest.stageOutcome = "success"; });
	await page.getByRole("button", { name: "Retry upload", exact: true }).click();
	await expect(publish(page)).toBeEnabled();
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Lotus garden");
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual(["lotus.jpg", "lotus.jpg"]);
});

for (const lateResult of ["complete", "fail"] as const) {
	test(`replacing a photo ignores the earlier upload's late ${lateResult}`, async ({ page }) => {
		await mountAdmin(page, "upload");
		await page.evaluate(() => { window.adminTest.stageOutcome = "pending"; });
		await choosePhoto(page);
		await fillTitle(page);
		await page.locator('input[name="image"]').setInputFiles(fixtureImage("replacement.jpg"));
		await page.evaluate((result) => {
			window.adminTest.stageRequests[1]!.complete("staging/replacement");
			if (result === "complete") window.adminTest.stageRequests[0]!.complete("staging/old");
			else window.adminTest.stageRequests[0]!.fail();
			window.adminTest.stageRequests[0]!.progress(0.2);
		}, lateResult);
		await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
		await expect(page.getByRole("alert")).toHaveCount(0);
		await outcome(page, "success");
		await publish(page).click();
		await expect(page.getByRole("heading", { name: "Your piece is live" })).toBeVisible();
		expect(await page.evaluate(() => window.adminTest.formSubmissions[0]!.imageKey)).toBe("staging/replacement");
	});
}

test("invalid optional values are shown beside their field before publishing", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	await fillTitle(page);
	const price = page.getByLabel("Price (optional)", { exact: true });
	await price.fill("0");
	await publish(page).click();
	await expect(price).toHaveAttribute("aria-invalid", "true");
	await expect(price).toBeFocused();
	await price.fill("");
	await page.getByText("More details", { exact: true }).click();
	const year = page.getByLabel("Year (optional)", { exact: true });
	await year.fill("1800");
	await page.getByText("More details", { exact: true }).click();
	await publish(page).click();
	await expect(year).toBeVisible();
	await expect(year).toBeFocused();
	await expect(page.getByText(/Year must be between/)).toBeVisible();
	await page.getByText("More details", { exact: true }).click();
	await expect(year).not.toBeVisible();
	await publish(page).click();
	await expect(year).toBeVisible();
	await expect(year).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls)).toHaveLength(0);
});

test("the details entrance does not take focus from someone already typing", async ({ page }) => {
	await mountAdmin(page, "upload");
	await choosePhoto(page);
	const title = page.getByLabel("Title *", { exact: true });
	await title.fill("Quick draft");
	await expect(page.getByRole("region", { name: "Give it a name" })).toHaveCSS("transform", "none");
	await expect(title).toBeFocused();
	await expect(title).toHaveValue("Quick draft");
});

test("a rejected file leaves retry and replacement available without losing the draft", async ({ page }) => {
	await mountAdmin(page, "upload");
	await page.evaluate(() => { window.adminTest.stageOutcome = "failure"; });
	await page.locator('input[name="image"]').setInputFiles({
		name: "scan.tiff", mimeType: "image/tiff", buffer: Buffer.from("rejected image fixture"),
	});
	await fillTitle(page);
	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page.getByRole("button", { name: "Retry upload", exact: true })).toBeEnabled();
	await expect(page.getByRole("button", { name: "Change photo", exact: true })).toBeEnabled();
	await expect(publish(page)).toHaveAccessibleDescription("Choose another photo or retry the upload.");
	await page.evaluate(() => { window.adminTest.stageOutcome = "success"; });
	await page.locator('input[name="image"]').setInputFiles(fixtureImage("replacement.jpg"));
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(publish(page)).toBeEnabled();
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Lotus garden");
});

test("Add opens the composer before the picker and close/reopen retains its draft", async ({ page }) => {
	await mountAdmin(page, "nav");
	let chooserOpened = false;
	page.on("filechooser", () => { chooserOpened = true; });
	const add = page.getByRole("button", { name: "Add a piece" });
	await add.click();
	await expect(page.getByRole("dialog", { name: "New piece" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Choose a photo" })).toBeVisible();
	expect(chooserOpened).toBe(false);
	await page.evaluate(() => { window.adminTest.stageOutcome = "pending"; });
	await choosePhoto(page);
	await fillTitle(page);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "New piece" })).toHaveCount(0);
	expect(await warnsBeforeReload(page)).toBe(true);
	await page.evaluate(() => window.adminTest.stageRequests[0]!.complete("staging/lotus"));
	await add.click();
	await expect(page.getByLabel("Title *", { exact: true })).toHaveValue("Lotus garden");
	await expect(page.getByText("lotus.jpg", { exact: true })).toBeVisible();
	await expect(page.getByText("Photo uploaded.", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual(["lotus.jpg"]);
});

test("dropping a batch explains the one-photo limit without starting uploads", async ({ page }) => {
	await mountAdmin(page, "upload");
	const dropped = await page.evaluateHandle(() => {
		const transfer = new DataTransfer();
		transfer.items.add(new File(["first"], "first.jpg", { type: "image/jpeg" }));
		transfer.items.add(new File(["second"], "second.jpg", { type: "image/jpeg" }));
		return transfer;
	});
	const photo = page.getByRole("region", { name: "Artwork photo" });
	await photo.dispatchEvent("drop", { dataTransfer: dropped });
	await expect(page.getByRole("alert")).toHaveText("Choose one photo for this piece.");
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toHaveLength(0);
	await dropped.evaluate((transfer) => transfer.items.remove(1));
	await photo.dispatchEvent("drop", { dataTransfer: dropped });
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(page.getByText("first.jpg", { exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Give it a name" })).toBeVisible();
});

test("a publishing sheet stays open, then the next Add starts a fresh piece", async ({ page }) => {
	await mountAdmin(page, "nav");
	const add = page.getByRole("button", { name: "Add a piece" });
	await add.click();
	await choosePhoto(page);
	await fillTitle(page);
	await page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Gond" }).click();
	await page.getByRole("combobox", { name: "Medium *" }).fill("Ink");
	await outcome(page, "pending");
	await publish(page).click();
	await expect(page.getByRole("button", { name: "Publishing…", exact: true })).toBeDisabled();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "New piece" })).toBeVisible();
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("heading", { name: "Your piece is live" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog", { name: "New piece" })).toHaveCount(0);
	await add.click();
	await expect(page.getByRole("button", { name: "Choose a photo" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Continue to details" })).toHaveCount(0);
});
