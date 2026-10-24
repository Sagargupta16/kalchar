import { describe, expect, it } from "vitest";
import { LEADS_PER_DAY_CAP, LEADS_PER_HOUR_CAP, leadIntakeFull } from "./lead-intake-cap";

describe("leadIntakeFull", () => {
	it("accepts saves below both caps", () => {
		expect(leadIntakeFull({ lastHour: 0, lastDay: 0 })).toBe(false);
		expect(
			leadIntakeFull({ lastHour: LEADS_PER_HOUR_CAP - 1, lastDay: LEADS_PER_DAY_CAP - 1 }),
		).toBe(false);
	});

	it("refuses once the hourly cap is reached", () => {
		expect(leadIntakeFull({ lastHour: LEADS_PER_HOUR_CAP, lastDay: LEADS_PER_HOUR_CAP })).toBe(
			true,
		);
	});

	it("refuses once the daily cap is reached, even in a quiet hour", () => {
		expect(leadIntakeFull({ lastHour: 0, lastDay: LEADS_PER_DAY_CAP })).toBe(true);
	});
});
