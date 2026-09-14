import { describe, expect, it } from "vitest";
import {
	formatLeadTimestamp,
	LEAD_STATUS_LABEL,
	leadReplyLinks,
	leadReplyMessage,
	parseLeadContact,
} from "./lead-triage";
import type { Lead } from "./types";

const lead = (over: Partial<Lead> = {}): Lead => ({
	id: "lead-1",
	name: "Priya",
	contact: "+91 98765 43210",
	style: "Pichwai",
	size: "A3",
	budget: "Under INR 5,000",
	timeline: "Within a month",
	brief: "A lotus pond.",
	status: "new",
	createdAt: "2026-09-13T09:01:00Z",
	...over,
});

describe("parseLeadContact", () => {
	it("prefixes 91 to a bare 10-digit Indian number and strips spaces, plus, dashes, brackets", () => {
		expect(parseLeadContact("98765 43210")).toEqual({ phone: "919876543210" });
		expect(parseLeadContact("+91 (98765) 432-10")).toEqual({ phone: "919876543210" });
		expect(parseLeadContact("0 98765 43210")).toEqual({ phone: "919876543210" });
		expect(parseLeadContact("0091 98765 43210")).toEqual({ phone: "919876543210" });
	});
	it("keeps an international number of 11 to 15 digits as typed", () => {
		expect(parseLeadContact("+44 7700 900123")).toEqual({ phone: "447700900123" });
	});
	it("reads an email, and both when the visitor typed both", () => {
		expect(parseLeadContact("priya@example.com")).toEqual({ email: "priya@example.com" });
		expect(parseLeadContact("priya@example.com or 98765 43210")).toEqual({
			phone: "919876543210",
			email: "priya@example.com",
		});
	});
	it("returns nothing for prose, short numbers or empty input", () => {
		expect(parseLeadContact("call me after 6")).toEqual({});
		expect(parseLeadContact("12345")).toEqual({});
		expect(parseLeadContact(undefined)).toEqual({});
	});
});

describe("leadReplyLinks", () => {
	it("builds WhatsApp then Call for a phone, with the greeting prefilled", () => {
		const links = leadReplyLinks(lead(), "Kalchar by Megha");
		expect(links.map((l) => l.kind)).toEqual(["whatsapp", "call"]);
		expect(links[0]?.href).toMatch(/^https:\/\/wa\.me\/919876543210\?text=Hi%20Priya%2C/);
		expect(links[0]?.external).toBe(true);
		expect(links[1]?.href).toBe("tel:+919876543210");
	});
	it("builds a mailto with subject and body for an email", () => {
		const [link] = leadReplyLinks(lead({ contact: "priya@example.com" }), "Kalchar by Megha");
		expect(link?.kind).toBe("email");
		expect(link?.href).toMatch(
			/^mailto:priya@example\.com\?subject=Your\+Kalchar\+by\+Megha\+custom-order\+enquiry&body=/,
		);
	});
	it("returns no links without a usable contact", () => {
		expect(leadReplyLinks(lead({ contact: undefined }), "Kalchar")).toEqual([]);
	});
});

describe("leadReplyMessage", () => {
	it("names the visitor, the style and the chosen options", () => {
		expect(leadReplyMessage(lead(), "Kalchar by Megha")).toBe(
			"Hi Priya, thank you for your enquiry about a Pichwai piece (A3, Under INR 5,000, Within a month). This is Kalchar by Megha.\nWe'd be glad to talk it through. When would be a good time to chat?",
		);
	});
	it("degrades to a generic greeting when the lead has no name, style or options", () => {
		const bare = lead({
			name: undefined,
			style: undefined,
			size: undefined,
			budget: undefined,
			timeline: undefined,
		});
		expect(leadReplyMessage(bare, "Kalchar")).toMatch(
			/^Hi, thank you for your custom-order enquiry\. This is Kalchar\.\n/,
		);
	});
	it("never contains a double dash or an exclamation mark", () => {
		expect(leadReplyMessage(lead(), "Kalchar")).not.toMatch(/--|!/);
	});
});

describe("formatLeadTimestamp", () => {
	it("prints the date and 12-hour time in India Standard Time", () => {
		const text = formatLeadTimestamp("2026-09-13T09:01:00Z");
		expect(text).toMatch(/^13 Sep/);
		expect(text).toMatch(/2026, 02:31 pm$/);
	});
	it("returns '' for empty or invalid input", () => {
		expect(formatLeadTimestamp("")).toBe("");
		expect(formatLeadTimestamp("not-a-date")).toBe("");
	});
});

describe("LEAD_STATUS_LABEL", () => {
	it("is sentence case for every status", () => {
		expect(Object.values(LEAD_STATUS_LABEL)).toEqual(["New", "Contacted", "Closed"]);
	});
});
