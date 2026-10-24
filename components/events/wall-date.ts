const EVENT_DATE_LOCALE = "en-IN";

/** Split an ISO date into wall-date parts ("24", "Sep", "2026"); null when invalid. Server-safe. */
export function wallDateParts(iso: string): { day: string; month: string; year: string } | null {
	if (!iso) return null;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	return {
		day: String(date.getUTCDate()),
		month: date.toLocaleDateString(EVENT_DATE_LOCALE, { month: "short", timeZone: "UTC" }),
		year: String(date.getUTCFullYear()),
	};
}
