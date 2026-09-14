import { LeadsManager } from "../../../app/admin/_components/leads-manager";
import type { Lead } from "../../../lib/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const now = Date.now();

/** New, phone contact, every preset chosen: the full DM row and sheet anatomy. */
const priya: Lead = {
	id: "lead-priya",
	name: "Priya Sharma",
	contact: "+91 98765 43210",
	style: "Gond",
	size: "24 x 36 in",
	budget: "INR 10k to 20k",
	timeline: "2 to 3 weeks",
	brief: "I would like a large Gond piece for our living room wall.",
	status: "new",
	createdAt: new Date(now - 2 * HOUR_MS).toISOString(),
};

/** Read (contacted), email contact, bare brief: the quiet row and the Copy email path. */
const rahul: Lead = {
	id: "lead-rahul",
	name: "Rahul Mehta",
	contact: "rahul@example.invalid",
	brief: "Pichwai commission for a wedding gift.",
	status: "contacted",
	createdAt: new Date(now - 3 * 24 * HOUR_MS).toISOString(),
};

/** Nameless and contactless: the Someone fallback with no reply actions. */
const anonymous: Lead = {
	id: "lead-anon",
	brief: "Do you take bulk orders for an office lobby?",
	status: "new",
	createdAt: new Date(now - 30 * MINUTE_MS).toISOString(),
};

/** Inbox views for the Tier 2a enquiries pass (admin-leads.spec.ts). */
export const leadViews = {
	leadsInbox: <LeadsManager leads={[priya, rahul, anonymous]} />,
	leadsEmpty: <LeadsManager leads={[]} />,
	leadsCaughtUp: <LeadsManager leads={[rahul]} />,
};
