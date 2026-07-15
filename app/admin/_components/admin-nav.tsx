"use client";

import {
	CalendarDays,
	Ellipsis,
	GraduationCap,
	Inbox,
	ListChecks,
	MessageSquareQuote,
	Palette,
	Tags,
	UserCircle,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Grouped so related destinations cluster instead of reading as one long,
// arbitrary row: the catalog, then community content, then the enquiry inbox,
// then site settings. A separator is drawn between groups on desktop.
const NAV_GROUPS = [
	[
		{ label: "Artworks", href: "/admin", icon: Palette },
		{ label: "Categories", href: "/admin/categories", icon: Tags },
		{ label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
	],
	[
		{ label: "Events", href: "/admin/events", icon: CalendarDays },
		{ label: "Workshops", href: "/admin/workshops", icon: GraduationCap },
	],
	[{ label: "Leads", href: "/admin/leads", icon: Inbox }],
	[
		{ label: "Presets", href: "/admin/presets", icon: ListChecks },
		{ label: "Profile", href: "/admin/profile", icon: UserCircle },
		{ label: "Maintainers", href: "/admin/maintainers", icon: Users },
	],
];

const NAV = NAV_GROUPS.flat();
const MOBILE_PRIMARY_HREFS = new Set([
	"/admin",
	"/admin/events",
	"/admin/workshops",
	"/admin/leads",
]);
const MOBILE_PRIMARY_NAV = NAV.filter((item) => MOBILE_PRIMARY_HREFS.has(item.href));
const MOBILE_MORE_NAV = NAV.filter((item) => !MOBILE_PRIMARY_HREFS.has(item.href));

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

/** Desktop horizontal nav, grouped with separators between clusters. */
export function AdminNavDesktop() {
	const isActive = useIsActive();
	return (
		<nav aria-label="Admin" className="flex min-h-14 items-center gap-1 overflow-x-auto">
			{NAV_GROUPS.map((group, gi) => (
				<div key={group[0]?.href ?? gi} className="flex items-center gap-1">
					{gi > 0 ? (
						<span aria-hidden="true" className="mx-1.5 h-5 shrink-0 border-l border-line" />
					) : null}
					{group.map((item) => {
						const active = isActive(item.href);
						return (
							<Link
								key={item.href}
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-(--radius-sm) px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
				</div>
			))}
		</nav>
	);
}

function MobileNavLink({
	href,
	label,
	icon: Icon,
	active,
}: Readonly<{
	href: string;
	label: string;
	icon: (typeof NAV)[number]["icon"];
	active: boolean;
}>) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex min-h-16 flex-col items-center justify-center gap-1 rounded-(--radius-sm) px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
				active ? "bg-bg-soft text-accent" : "text-muted hover:bg-bg-soft hover:text-ink",
			)}
		>
			<Icon size={19} aria-hidden="true" className={active ? "fill-accent/10" : undefined} />
			<span>{label}</span>
		</Link>
	);
}

/** Compact mobile/tablet navigation with secondary tools behind one menu. */
export function AdminNavMobile() {
	const isActive = useIsActive();
	const [moreOpen, setMoreOpen] = useState(false);
	const moreButtonRef = useRef<HTMLButtonElement>(null);
	const firstMoreLinkRef = useRef<HTMLAnchorElement>(null);
	const moreActive = MOBILE_MORE_NAV.some((item) => isActive(item.href));

	useEffect(() => {
		if (!moreOpen) return;
		firstMoreLinkRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMoreOpen(false);
				moreButtonRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [moreOpen]);

	return (
		<>
			{moreOpen ? (
				<div
					id="admin-more-tools"
					className="fixed left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-(--radius-md) border border-line bg-bg p-3 shadow-e5 xl:hidden"
					style={{
						bottom: "calc(var(--space-16) + env(safe-area-inset-bottom) + var(--space-3))",
					}}
				>
					<div className="mb-2 flex min-h-11 items-center justify-between gap-3 px-1">
						<p className="text-sm font-semibold">More tools</p>
						<button
							type="button"
							onClick={() => {
								setMoreOpen(false);
								moreButtonRef.current?.focus();
							}}
							aria-label="Close more tools"
							className="grid h-11 w-11 place-items-center rounded-(--radius-sm) text-muted transition-colors hover:bg-bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
					<ul className="grid grid-cols-2 gap-1">
						{MOBILE_MORE_NAV.map((item, index) => {
							const active = isActive(item.href);
							return (
								<li key={item.href}>
									<Link
										ref={index === 0 ? firstMoreLinkRef : undefined}
										href={item.href}
										onClick={() => setMoreOpen(false)}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex min-h-12 items-center gap-2.5 rounded-(--radius-sm) px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
											active ? "bg-bg-soft font-medium text-accent" : "text-ink hover:bg-bg-soft",
										)}
									>
										<item.icon size={17} aria-hidden="true" />
										{item.label}
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			) : null}

			<nav
				aria-label="Admin"
				className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md xl:hidden"
				style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
			>
				<ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2">
					{MOBILE_PRIMARY_NAV.map((item) => (
						<li key={item.href}>
							<MobileNavLink
								href={item.href}
								label={item.label}
								icon={item.icon}
								active={isActive(item.href)}
							/>
						</li>
					))}
					<li>
						<button
							ref={moreButtonRef}
							type="button"
							onClick={() => setMoreOpen((open) => !open)}
							aria-expanded={moreOpen}
							aria-controls="admin-more-tools"
							className={cn(
								"flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-(--radius-sm) px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
								moreOpen || moreActive
									? "bg-bg-soft text-accent"
									: "text-muted hover:bg-bg-soft hover:text-ink",
							)}
						>
							<Ellipsis size={19} aria-hidden="true" />
							<span>More</span>
						</button>
					</li>
				</ul>
			</nav>
		</>
	);
}
