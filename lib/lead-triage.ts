/**
 * Pure helpers for the admin enquiry queue (app/admin/_components/leads-manager.tsx,
 * lead-card.tsx). Kept out of lib/utils.ts (admin-content owns it) and out of
 * lib/whatsapp.ts (public messages) so the admin reply flow is unit-tested here.
 */
import type { Lead, LeadStatus } from "./types";
import { buildWhatsAppLink } from "./whatsapp";

export const LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "closed"];

/** Sentence-case labels for the status select, the chip and the filter row. */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
	new: "New",
	contacted: "Contacted",
	closed: "Closed",
};

/** India is the default country when a visitor types a bare 10-digit number. */
const DEFAULT_COUNTRY_CODE = "91";
const EMAIL_RE = /[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]+/;

export interface LeadContact {
	/** E.164 digits without the plus, ready for wa.me and tel:. */
	phone?: string;
	email?: string;
}

/**
 * The public form captures "Email or WhatsApp number" as one free-text field, so
 * a contact may hold either, both, or prose. Digits are read after removing the
 * email token; spaces, +, dashes, dots and brackets are ignored (WhatsApp's own
 * rule: "omit any zeroes, brackets, or dashes").
 */
export function parseLeadContact(contact: string | undefined): LeadContact {
	if (!contact) return {};
	const email = EMAIL_RE.exec(contact)?.[0];
	const phone = normalisePhone(email ? contact.replace(email, " ") : contact);
	return { ...(phone ? { phone } : {}), ...(email ? { email } : {}) };
}

function normalisePhone(raw: string): string | undefined {
	const digits = raw.replace(/\D/g, "");
	const international = /^\D*\+/.test(raw) || digits.startsWith("00");
	const trimmed = digits.startsWith("00") ? digits.slice(2) : digits;
	if (international) return /^[1-9]\d{7,14}$/.test(trimmed) ? trimmed : undefined;
	if (trimmed.length === 10) return `${DEFAULT_COUNTRY_CODE}${trimmed}`;
	if (trimmed.length === 11 && trimmed.startsWith("0")) {
		return `${DEFAULT_COUNTRY_CODE}${trimmed.slice(1)}`;
	}
	if (trimmed.length >= 11 && trimmed.length <= 15) return trimmed;
	return undefined;
}

/** The greeting the artist sends back; first-person plural, no double dash, no exclamation. */
export function leadReplyMessage(lead: Lead, siteName: string): string {
	const greeting = lead.name ? `Hi ${lead.name},` : "Hi,";
	const about = lead.style
		? `your enquiry about a ${lead.style} piece`
		: "your custom-order enquiry";
	const details = [lead.size, lead.budget, lead.timeline].filter(Boolean).join(", ");
	return [
		`${greeting} thank you for ${about}${details ? ` (${details})` : ""}. This is ${siteName}.`,
		"We'd be glad to talk it through. When would be a good time to chat?",
	].join("\n");
}

export type LeadReplyKind = "whatsapp" | "call" | "email";

export interface LeadReplyLink {
	kind: LeadReplyKind;
	label: string;
	href: string;
	/** Open in a new tab (wa.me); tel: and mailto: stay in place. */
	external: boolean;
}

/** Zero to three links for a lead card, WhatsApp first because that is the sales channel. */
export function leadReplyLinks(lead: Lead, siteName: string): LeadReplyLink[] {
	const { phone, email } = parseLeadContact(lead.contact);
	const message = leadReplyMessage(lead, siteName);
	const links: LeadReplyLink[] = [];
	if (phone) {
		links.push({
			kind: "whatsapp",
			label: "Reply on WhatsApp",
			href: buildWhatsAppLink({ phoneE164NoPlus: phone, message }),
			external: true,
		});
		links.push({ kind: "call", label: "Call", href: `tel:+${phone}`, external: false });
	}
	if (email) {
		const params = new URLSearchParams({
			subject: `Your ${siteName} custom-order enquiry`,
			body: message,
		});
		links.push({
			kind: "email",
			label: "Email",
			href: `mailto:${email}?${params}`,
			external: false,
		});
	}
	return links;
}

/**
 * "13 Sept 2026, 02:31 pm" in the artist's zone. The zone is fixed so the server
 * render (UTC on Vercel) and the client render (IST) print the same string and
 * hydration never mismatches. Returns "" for empty or invalid input.
 */
export function formatLeadTimestamp(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Kolkata",
	});
}

/** Uppercase initials for the inbox disc: first and last word ("Priya Sharma" -> "PS"). */
export function leadInitials(name: string | undefined): string {
	const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.charAt(0);
	if (!first) return "?";
	const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? "") : "";
	return `${first}${last}`.toUpperCase();
}

/** One truncating inbox line: the chosen options, then the brief in quotes when options exist. */
export function leadSnippet(lead: Lead): string {
	const values = [lead.style, lead.size, lead.budget, lead.timeline].filter(Boolean).join(", ");
	return values ? `${values}, "${lead.brief}"` : lead.brief;
}

const MINUTE_S = 60;
const HOUR_S = 3600;
const DAY_S = 86400;
const WEEK_S = 7 * DAY_S;

/**
 * DM-style short stamp for the inbox date column: "now", "5m", "2h" within a
 * day, the weekday ("Mon") within a week, then "12 Mar". Day boundaries use
 * the artist's zone like formatLeadTimestamp; `now` is injectable for tests.
 * Returns "" for empty or invalid input.
 */
export function formatLeadShortDate(iso: string, now: Date = new Date()): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const seconds = Math.max(0, (now.getTime() - d.getTime()) / 1000);
	if (seconds < MINUTE_S) return "now";
	if (seconds < HOUR_S) return `${Math.floor(seconds / MINUTE_S)}m`;
	if (seconds < DAY_S) return `${Math.floor(seconds / HOUR_S)}h`;
	if (seconds < WEEK_S) {
		return d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
	}
	return d.toLocaleDateString("en-IN", {
		day: "numeric",
		month: "short",
		timeZone: "Asia/Kolkata",
	});
}
