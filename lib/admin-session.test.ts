import { describe, expect, it } from "vitest";
import { safeAdminCallback } from "./admin-callback";
import {
	adminFailureMessage,
	NOT_AUTHORIZED_MESSAGE,
	SIGNED_OUT_MESSAGE,
	signInAgainHref,
} from "./admin-session";

describe("adminFailureMessage", () => {
	it("explains a refused session in plain words", () => {
		expect(adminFailureMessage(NOT_AUTHORIZED_MESSAGE)).toBe(SIGNED_OUT_MESSAGE);
	});

	it("keeps every other failure message as the server wrote it", () => {
		expect(adminFailureMessage("Quote is required.")).toBe("Quote is required.");
	});
});

describe("signInAgainHref", () => {
	it("returns to the current admin page and its query after sign-in", () => {
		const href = signInAgainHref("/admin/leads?page=2");
		const url = new URL(href, "https://kalchar.co.in");
		expect(url.pathname).toBe("/login");
		expect(url.searchParams.get("callbackUrl")).toBe("/admin/leads?page=2");
		expect(safeAdminCallback(url.searchParams.get("callbackUrl"))).toBe("/admin/leads?page=2");
	});

	it("falls back to the admin home for anything outside the admin", () => {
		expect(signInAgainHref("/contact")).toBe("/login?callbackUrl=%2Fadmin");
		expect(signInAgainHref("//example.org/admin")).toBe("/login?callbackUrl=%2Fadmin");
	});
});
