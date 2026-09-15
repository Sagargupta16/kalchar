"use client";

import {
	CalendarDays,
	GraduationCap,
	Inbox,
	ListChecks,
	MessageSquareQuote,
	Palette,
	Tags,
	UserCircle,
	Users,
} from "lucide-react";
import { usePathname } from "next/navigation";

export const ADMIN_NAV_GROUPS = [
	{
		label: "Gallery",
		items: [
			{ label: "Pieces", href: "/admin", icon: Palette },
			{ label: "Categories", href: "/admin/categories", icon: Tags },
		],
	},
	{
		label: "Community",
		items: [
			{ label: "Events", href: "/admin/events", icon: CalendarDays },
			{ label: "Workshops", href: "/admin/workshops", icon: GraduationCap },
			{ label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
		],
	},
	{
		label: "Enquiries",
		items: [
			{ label: "Enquiries", href: "/admin/leads", icon: Inbox },
			{ label: "Presets", href: "/admin/presets", icon: ListChecks },
		],
	},
	{
		label: "Settings",
		items: [
			{ label: "Profile", href: "/admin/profile", icon: UserCircle },
			{ label: "Maintainers", href: "/admin/maintainers", icon: Users },
		],
	},
];

/** Counts keyed by href; only new enquiries carry a badge. */
export type NavCounts = Readonly<Partial<Record<string, number>>>;

export function badgeCount(counts: NavCounts | undefined, href: string): number {
	return href === "/admin/leads" ? (counts?.[href] ?? 0) : 0;
}

export function badgeName(label: string, count: number): string | undefined {
	return count > 0 ? `${label}, ${count} new` : undefined;
}

const PILL =
	"grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-micro font-semibold tabular-nums text-bg";

export function CountPill({ count, className }: Readonly<{ count: number; className?: string }>) {
	return (
		// Keep the custom text-micro size out of tailwind-merge; the link announces the full count.
		<span aria-hidden="true" className={className ? `${PILL} ${className}` : PILL}>
			{count > 9 ? "9+" : count}
		</span>
	);
}

export function useIsActive() {
	const pathname = usePathname();
	const path = pathname.replace(/\/$/, "") || "/";
	return (href: string) => {
		if (href === "/admin") return path === "/admin";
		return path === href || path.startsWith(`${href}/`);
	};
}

/** Direct creation on the pieces and events routes; a choice elsewhere. */
export function useAddContext(): "piece" | "event" | "choice" {
	const pathname = usePathname();
	const path = pathname.replace(/\/$/, "") || "/";
	if (path === "/admin") return "piece";
	if (path === "/admin/events" || path.startsWith("/admin/events/")) return "event";
	return "choice";
}
