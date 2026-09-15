import { expect, test } from "@playwright/test";
import { mountAdmin, outcome } from "../admin/browser-fixture";

const portrait = {
	name: "portrait.png",
	mimeType: "image/png",
	buffer: Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=",
		"base64",
	),
};

for (const invalid of [
	{ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo"), error: /JPG/ },
	{ name: "empty.png", mimeType: "image/png", buffer: Buffer.alloc(0), error: /empty/ },
]) {
	test(`profile: ${invalid.name} is explained before uploading`, async ({ page }) => {
		await mountAdmin(page, "profile");
		const picker = page.getByLabel("Change photo", { exact: true });
		await picker.setInputFiles(invalid);
		await expect(picker).toHaveAttribute("aria-invalid", "true");
		await expect(page.getByRole("alert")).toContainText(invalid.error);
		await expect(page.getByRole("button", { name: "Upload photo" })).toBeDisabled();
		expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual([]);
		expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
		await page.getByRole("button", { name: "Remove selected image" }).click();
		await expect(page.getByRole("alert")).toHaveCount(0);
		await expect(picker).toBeFocused();
	});
}

test("profile: an oversized photo cannot be submitted", async ({ page }) => {
	await mountAdmin(page, "profile");
	await page.locator('input[name="image"]').evaluate((input: HTMLInputElement) => {
		const selection = new DataTransfer();
		selection.items.add(
			new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
		);
		input.files = selection.files;
		input.dispatchEvent(new Event("change", { bubbles: true }));
	});
	await expect(page.getByRole("alert")).toContainText("20 MB");
	await expect(page.getByRole("button", { name: "Upload photo" })).toBeDisabled();
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual([]);
});

test("profile: replacing or clearing a failed selection clears its old error", async ({
	page,
}) => {
	await mountAdmin(page, "profile");
	const picker = page.getByLabel("Change photo", { exact: true });
	await picker.setInputFiles(portrait);
	await outcome(page, "failure");
	await page.getByRole("button", { name: "Upload photo" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();

	await picker.setInputFiles({ ...portrait, name: "replacement.png" });
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(page.getByText("replacement.png", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Upload photo" }).click();
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await page.getByRole("button", { name: "Remove selected image" }).click();
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Upload photo" })).toHaveCount(0);
	await expect(picker).toBeFocused();
	await picker.setInputFiles(portrait);
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
});

test("profile: an interrupted upload keeps its draft and can be retried once", async ({ page }) => {
	await mountAdmin(page, "profile");
	const picker = page.getByLabel("Change photo", { exact: true });
	await picker.setInputFiles(portrait);
	await page.evaluate(() => {
		window.adminTest.stageOutcome = "pending";
	});
	const upload = page.getByRole("button", { name: "Upload photo" });
	await upload.click();
	await expect(picker).toBeDisabled();
	await expect(page.getByRole("button", { name: "Remove selected image" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Remove photo", exact: true })).toBeDisabled();
	await expect(page.getByRole("switch", { name: "Show artist intro on home" })).toBeEnabled();
	await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
	expect(await page.evaluate(() => window.adminTest.stageCalls)).toEqual([portrait.name]);
	await page.evaluate(() => window.adminTest.stageRequests[0]?.progress(0.36));
	await expect(page.getByRole("progressbar")).toHaveAttribute("value", "36");
	await expect(page.getByRole("progressbar")).toHaveAttribute("max", "100");
	await expect(page.getByText(/ready to upload/)).toHaveCount(0);

	await page.evaluate(() => window.adminTest.stageRequests[0]?.fail());
	await expect(page.getByRole("alert")).toHaveText("Photo upload interrupted.");
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
	await expect(upload).toBeEnabled();
	await page.evaluate(() => {
		window.adminTest.stageOutcome = "success";
	});
	await outcome(page, "success");
	await upload.click();
	await expect(
		page.getByRole("region", { name: "Profile photo", exact: true }).getByRole("status"),
	).toContainText("Profile photo updated");
	await expect(page.getByText(portrait.name, { exact: true })).toHaveCount(0);
	await expect(picker).toBeFocused();
	expect(await page.evaluate(() => window.adminTest.calls.map((call) => call.name))).toEqual([
		"setProfileImage",
	]);
});

test("profile: removing the saved photo preserves a selected replacement", async ({ page }) => {
	await mountAdmin(page, "profile");
	await page.getByLabel("Change photo", { exact: true }).setInputFiles(portrait);
	const remove = page
		.getByRole("region", { name: "Profile photo", exact: true })
		.getByRole("button", { name: "Remove photo", exact: true });
	await remove.click();
	let dialog = page.getByRole("dialog", { name: "Remove profile photo?" });
	await expect(dialog).toContainText("selected photo");
	await dialog.getByRole("button", { name: "Keep photo" }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);

	await outcome(page, "pending");
	await remove.click();
	dialog = page.getByRole("dialog", { name: "Remove profile photo?" });
	await dialog.getByRole("button", { name: "Remove photo", exact: true }).click();
	await expect(page.getByText("Removing saved photo…", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Change photo", { exact: true })).toBeDisabled();
	await outcome(page, "success");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByText("Removing saved photo…", { exact: true })).toHaveCount(0);
	await expect(
		page.getByRole("region", { name: "Profile photo", exact: true }).getByRole("status"),
	).toContainText("Photo removed");
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Upload photo" })).toBeEnabled();
});

test("profile: closing or reloading warns only while there is unsaved work", async ({ page }) => {
	await mountAdmin(page, "profile");
	const wouldWarn = () =>
		page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
	expect(await wouldWarn()).toBe(false);
	await page.getByLabel("Change photo", { exact: true }).setInputFiles(portrait);
	await expect.poll(wouldWarn).toBe(true);
	await page.getByRole("button", { name: "Remove selected image" }).click();
	await expect.poll(wouldWarn).toBe(false);
	await outcome(page, "pending");
	await page.getByRole("switch", { name: "Show artist intro on home" }).click();
	await expect.poll(wouldWarn).toBe(true);
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect.poll(wouldWarn).toBe(false);
});

test("profile: a new intro change retires the earlier Undo offer", async ({ page }) => {
	await mountAdmin(page, "profile");
	await outcome(page, "success");
	const toggle = page.getByRole("switch", { name: "Show artist intro on home" });
	await toggle.focus();
	await page.keyboard.press("Space");
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
	await outcome(page, "pending");
	await toggle.click();
	await expect(page.getByText("Saving home intro…", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
	await expect(toggle).toBeDisabled();
	await outcome(page, "failure");
	await page.evaluate(() => window.adminTest.release?.());
	await expect(page.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(toggle).toBeEnabled();
	await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("profile: a saved preview can be reloaded without changing the photo", async ({ page }) => {
	await mountAdmin(page, "profile");
	await page.evaluate(() => {
		document.querySelector('img[alt="Current profile"]')?.dispatchEvent(new Event("error"));
	});
	await expect(page.getByText("Saved photo preview unavailable.", { exact: true })).toBeVisible();
	await page.route("https://profile-preview.test/media/**", (route) =>
		route.fulfill({ contentType: "image/png", body: portrait.buffer }),
	);
	await page.evaluate(() => {
		const base = document.createElement("base");
		base.href = "https://profile-preview.test/";
		document.head.prepend(base);
	});
	await page.getByRole("button", { name: "Reload preview" }).click();
	const preview = page.getByRole("img", { name: "Current profile", exact: true });
	await expect(preview).toBeVisible();
	await expect
		.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
		.toBeGreaterThan(0);
	await expect(page.getByText("Saved photo preview unavailable.", { exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => window.adminTest.calls)).toEqual([]);
});

test("profile: a rejected removal keeps the draft and permits a retry", async ({ page }) => {
	await mountAdmin(page, "profile");
	await page.getByLabel("Change photo", { exact: true }).setInputFiles(portrait);
	const panel = page.getByRole("region", { name: "Profile photo", exact: true });
	await panel.getByRole("button", { name: "Remove photo", exact: true }).click();
	await outcome(page, "failure");
	let dialog = page.getByRole("dialog", { name: "Remove profile photo?" });
	await dialog.getByRole("button", { name: "Remove photo", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(panel.getByRole("alert")).toHaveText("Change was rejected.");
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
	await panel.getByRole("button", { name: "Remove photo", exact: true }).click();
	await outcome(page, "success");
	dialog = page.getByRole("dialog", { name: "Remove profile photo?" });
	await dialog.getByRole("button", { name: "Remove photo", exact: true }).click();
	await expect(panel.getByText("Removing saved photo…", { exact: true })).toHaveCount(0);
	await expect(panel.getByRole("status")).toContainText("Photo removed");
	await expect(panel.getByRole("alert")).toHaveCount(0);
	await expect(page.getByText(portrait.name, { exact: true })).toBeVisible();
	expect(await page.evaluate(() => window.adminTest.calls.map((call) => call.name))).toEqual([
		"clearProfileImage",
		"clearProfileImage",
	]);
});
