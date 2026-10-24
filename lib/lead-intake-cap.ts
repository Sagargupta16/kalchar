/**
 * Site-wide ceiling on saved enquiries, counted from the leads table itself
 * (no extra service, no migration). The per-instance limiter in
 * app/admin/lead-actions.ts stops one visitor hammering one warm instance;
 * this stops a spread-out flood across instances. A refused save still leaves
 * the visitor's WhatsApp and email handoff working.
 */

/** Far above a busy real hour for a solo artist, low enough to bound a flood. */
export const LEADS_PER_HOUR_CAP = 30;
/** Same reasoning over a day; keeps the inbox triageable after an attack. */
export const LEADS_PER_DAY_CAP = 200;

export interface RecentLeadCounts {
	lastHour: number;
	lastDay: number;
}

/** True when another save would pass either cap. */
export function leadIntakeFull({ lastHour, lastDay }: RecentLeadCounts): boolean {
	return lastHour >= LEADS_PER_HOUR_CAP || lastDay >= LEADS_PER_DAY_CAP;
}
