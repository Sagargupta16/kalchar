import { describe, expect, it } from "vitest";
import { createFixedWindowRateLimiter } from "./fixed-window-rate-limit";

describe("createFixedWindowRateLimiter", () => {
	it("limits each client independently and resets after the window", () => {
		const isLimited = createFixedWindowRateLimiter({
			limit: 2,
			windowMs: 1000,
			maxKeys: 10,
		});

		expect(isLimited("client-a", 0)).toBe(false);
		expect(isLimited("client-a", 100)).toBe(false);
		expect(isLimited("client-a", 200)).toBe(true);
		expect(isLimited("client-b", 200)).toBe(false);
		expect(isLimited("client-a", 1000)).toBe(false);
	});

	it("evicts old keys when the bounded map is full", () => {
		const isLimited = createFixedWindowRateLimiter({
			limit: 1,
			windowMs: 10_000,
			maxKeys: 2,
		});

		expect(isLimited("first", 0)).toBe(false);
		expect(isLimited("second", 1)).toBe(false);
		expect(isLimited("third", 2)).toBe(false);
		expect(isLimited("first", 3)).toBe(false);
	});
});
