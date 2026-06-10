"use client";

import {
	CalendarDays,
	GraduationCap,
	ListChecks,
	Palette,
	Tags,
	UserCircle,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
	{ label: "Artworks", href: "/admin", icon: Palette },
	{ label: "Events", href: "/admin/events", icon: CalendarDays },
	{ label: "Categories", href: "/admin/categories", icon: Tags },
	{ label: "Workshops", href: "/admin/workshops", icon: GraduationCap },
	{ label: "Presets", href: "/admin/presets", icon: ListChecks },
	{ label: "Profile", href: "/admin/profile", icon: UserCircle },
	{ label: "Maintainers", href: "/admin/maintainers", icon: Users },
];

function useIsActive() {
	const pathname = usePathname();
	const path = pathname.replace(/\/$/, "") || "/";
	return (href: string) => {
		// /admin is exact-match only (every other route starts with /admin too);
		// the rest match on the route or a true sub-path.
		if (href === "/admin") return path === "/admin";
		return path === href || path.startsWith(`${href}/`);
	};
}

/** Desktop horizontal nav (>= md). */
export function AdminNavDesktop() {
	const isActive = useIsActive();
	return (
		<nav aria-label="Admin" className="hidden items-center gap-1 md:flex">
			{NAV.map((item) => {
				const active = isActive(item.href);
				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={active ? "page" : undefined}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-(--radius-sm) px-3 py-1.5 text-sm transition-colors",
							active
								? "bg-bg-muted font-medium text-ink"
								: "text-muted hover:bg-bg-muted hover:text-ink",
						)}
					>
						<item.icon size={14} className={active ? "text-accent" : undefined} />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}

/** Mobile bottom tab bar (< md). Fixed, thumb-reachable, safe-area aware. */
export function AdminNavMobile() {
	const isActive = useIsActive();
	return (
		<nav
			aria-label="Admin"
			className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md md:hidden"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<ul className="mx-auto flex max-w-6xl">
				{NAV.map((item) => {
					const active = isActive(item.href);
					return (
						<li key={item.href} className="flex-1">
							<Link
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] transition-colors",
									active ? "text-accent" : "text-muted hover:text-ink",
								)}
							>
								<item.icon size={18} className={active ? "fill-accent/10" : undefined} />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
