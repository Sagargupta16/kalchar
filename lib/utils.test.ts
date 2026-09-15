import { describe, expect, it } from "vitest";
import {
	cn,
	formatBytes,
	formatEventDate,
	formatEventDateShort,
	formatInr,
	toRoman,
} from "./utils";

describe("cn", () => {
	it("keeps a custom size token next to a text colour", () => {
		expect(cn("text-micro", "text-muted")).toBe("text-micro text-muted");
		expect(cn("text-label text-accent-text")).toBe("text-label text-accent-text");
	});
	it("lets a later size win over an earlier one, built-in or custom", () => {
		expect(cn("text-sm", "text-micro")).toBe("text-micro");
		expect(cn("text-h3", "text-h1")).toBe("text-h1");
		expect(cn("text-micro", "text-sm")).toBe("text-sm");
	});
});

describe("formatInr", () => {
	it("formats with the INR label and Indian digit grouping", () => {
		expect(formatInr(12500)).toBe("INR 12,500");
		expect(formatInr(100000)).toBe("INR 1,00,000");
	});
	it("handles zero", () => {
		expect(formatInr(0)).toBe("INR 0");
	});
});

describe("formatEventDate", () => {
	it("formats an ISO date as a long en-IN date", () => {
		// 2026-03-12 -> "12 March 2026"
		expect(formatEventDate("2026-03-12")).toBe("12 March 2026");
	});
	it("returns '' for empty input", () => {
		expect(formatEventDate("")).toBe("");
	});
	it("returns '' for an invalid date instead of 'Invalid Date'", () => {
		expect(formatEventDate("not-a-date")).toBe("");
	});
});

describe("formatEventDateShort", () => {
	it("formats an ISO date as a short en-IN date", () => {
		expect(formatEventDateShort("2026-03-12")).toBe("12 Mar 2026");
	});
	it("accepts a full ISO timestamp", () => {
		expect(formatEventDateShort("2026-03-12T10:00:00.000Z")).toBe("12 Mar 2026");
	});
	it("returns '' for empty and invalid input", () => {
		expect(formatEventDateShort("")).toBe("");
		expect(formatEventDateShort("not-a-date")).toBe("");
	});
});

describe("formatBytes", () => {
	it("uses KB below a megabyte and one decimal MB above", () => {
		expect(formatBytes(512)).toBe("1 KB");
		expect(formatBytes(860_160)).toBe("840 KB");
		expect(formatBytes(5_452_595)).toBe("5.2 MB");
	});
	it("treats empty or invalid sizes as 0 KB", () => {
		expect(formatBytes(0)).toBe("0 KB");
		expect(formatBytes(Number.NaN)).toBe("0 KB");
	});
});

describe("toRoman", () => {
	it("covers the ledger range the teasers use", () => {
		expect(toRoman(1)).toBe("I");
		expect(toRoman(2)).toBe("II");
		expect(toRoman(3)).toBe("III");
		expect(toRoman(4)).toBe("IV");
		expect(toRoman(5)).toBe("V");
	});
	it("handles subtractive and compound forms", () => {
		expect(toRoman(9)).toBe("IX");
		expect(toRoman(14)).toBe("XIV");
		expect(toRoman(40)).toBe("XL");
		expect(toRoman(1994)).toBe("MCMXCIV");
	});
	it("floors fractions and returns '' for zero, negative and non-finite input", () => {
		expect(toRoman(3.9)).toBe("III");
		expect(toRoman(0)).toBe("");
		expect(toRoman(-2)).toBe("");
		expect(toRoman(Number.NaN)).toBe("");
	});
});
