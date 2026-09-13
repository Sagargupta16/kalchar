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
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { SPRING_INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { adminIconBtnGhost, ICON_MD, ICON_TAB } from "./controls";

// Grouped so related destinations cluster instead of reading as one long,
// arbitrary row: the catalog, then community content, then the enquiry inbox,
// then site settings. A separator is drawn between groups on desktop.
const NAV_GROUPS = [
	[
		{ label: "Pieces", href: "/admin", icon: Palette },
		{ label: "Categories", href: "/admin/categories", icon: Tags },
		{ label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
	],
	[
		{ label: "Events", href: "/admin/events", icon: CalendarDays },
		{ label: "Workshops", href: "/admin/workshops", icon: GraduationCap },
	],
	[{ label: "Enquiries", href: "/admin/leads", icon: Inbox }],
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
const MORE_GROUPS = NAV_GROUPS.map((group) =>
	group.filter((item) => !MOBILE_PRIMARY_HREFS.has(item.href)),
).filter((group) => group.length > 0);

/** The one tab that may carry a badge (new enquiries); every other href is ignored. */
const BADGE_HREF = "/admin/leads";

/** Counts keyed by href; the shell renders a pill only for BADGE_HREF and only when > 0. */
export type NavCounts = Readonly<Partial<Record<string, number>>>;

function badgeCount(counts: NavCounts | undefined, href: string): number {
	if (href !== BADGE_HREF) return 0;
	return counts?.[href] ?? 0;
}

function badgeName(label: string, count: number): string | undefined {
	return count > 0 ? `${label}, ${count} new` : undefined;
}

const PILL =
	"grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-micro font-semibold tabular-nums text-bg";

function CountPill({ count, className }: Readonly<{ count: number; className?: string }>) {
	return (
		// Not cn(): tailwind-merge would drop the custom text-micro size in favour of text-bg.
		<span aria-hidden="true" className={className ? `${PILL} ${className}` : PILL}>
			{count > 99 ? "99+" : count}
		</span>
	);
}

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

// transition-ui, not transition-colors: Tailwind's transition-colors also animates
// outline-color, so the focus outline faded in from the muted text colour instead of
// appearing in accent at once. transition-ui lists its properties explicitly.
const DESKTOP_LINK =
	"relative isolate inline-flex min-h-control items-center gap-1.5 whitespace-nowrap rounded-(--radius-sm) px-3 text-sm font-medium transition-ui pressable";

/** Desktop horizontal nav, grouped with separators between clusters. */
export function AdminNavDesktop({ counts }: Readonly<{ counts?: NavCounts }> = {}) {
	const isActive = useIsActive();
	return (
		<nav aria-label="Admin" className="flex min-h-14 items-center gap-1 overflow-x-auto">
			<LayoutGroup id="admin-nav-desktop">
				{NAV_GROUPS.map((group, gi) => (
					<div key={group[0]?.href ?? gi} className="flex items-center gap-1">
						{gi > 0 ? (
							<span aria-hidden="true" className="mx-1.5 h-5 shrink-0 border-l border-line" />
						) : null}
						{group.map((item) => {
							const active = isActive(item.href);
							const count = badgeCount(counts, item.href);
							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={active ? "page" : undefined}
									aria-label={badgeName(item.label, count)}
									className={cn(
										DESKTOP_LINK,
										active ? "text-ink" : "text-muted hover:bg-bg-muted hover:text-ink",
									)}
								>
									{active ? (
										<motion.span
											layoutId="admin-nav-active"
											aria-hidden="true"
											className="absolute inset-0 -z-10 rounded-(--radius-sm) bg-bg-muted"
											transition={SPRING_INDICATOR}
										/>
									) : null}
									<item.icon
										size={ICON_MD}
										aria-hidden="true"
										className={active ? "text-accent-text" : undefined}
									/>
									{item.label}
									{count > 0 ? <CountPill count={count} className="ml-1.5" /> : null}
								</Link>
							);
						})}
					</div>
				))}
			</LayoutGroup>
		</nav>
	);
}

const TAB_CELL =
	"relative isolate flex h-full w-full flex-col items-center justify-center gap-1 rounded-(--radius-sm) px-1 font-medium transition-ui pressable focus-visible:-outline-offset-2";
// text-label sits on the label span, not in TAB_CELL: tailwind-merge does not know the
// custom size token and would drop it next to the cell's text colour inside cn().
const TAB_LABEL = "text-label";

function MobileNavLink({
	href,
	label,
	icon: Icon,
	active,
	count,
}: Readonly<{
	href: string;
	label: string;
	icon: (typeof NAV)[number]["icon"];
	active: boolean;
	count: number;
}>) {
	const reduce = usePrefersReducedMotion();
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			aria-label={badgeName(label, count)}
			onClick={(event) => {
				// Re-tapping the active tab resets scroll instead of re-navigating.
				if (!active) return;
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
			}}
			className={cn(TAB_CELL, active ? "text-accent-text" : "text-muted hover:text-ink")}
		>
			{active ? (
				<motion.span
					layoutId="admin-tab-active"
					aria-hidden="true"
					className="absolute inset-x-1 inset-y-2 -z-10 rounded-(--radius-sm) bg-canvas"
					transition={SPRING_INDICATOR}
				/>
			) : null}
			<Icon size={ICON_TAB} aria-hidden="true" />
			<span className={cn("max-w-full truncate", TAB_LABEL)}>{label}</span>
			{count > 0 ? <CountPill count={count} className="absolute top-2 left-1/2 ml-2" /> : null}
		</Link>
	);
}

/** Compact mobile/tablet navigation with secondary tools behind one sheet. */
export function AdminNavMobile({ email, counts }: Readonly<{ email: string; counts?: NavCounts }>) {
	const isActive = useIsActive();
	const pathname = usePathname();
	const sheetTitleId = useId();
	const [moreOpen, setMoreOpen] = useState(false);
	const moreButtonRef = useRef<HTMLButtonElement>(null);
	const firstMoreLinkRef = useRef<HTMLAnchorElement>(null);
	const moreActive = MOBILE_MORE_NAV.some((item) => isActive(item.href));

	const close = () => {
		setMoreOpen(false);
		moreButtonRef.current?.focus();
	};

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

	// Hardware Back / any route change closes the sheet.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value we read
	useEffect(() => {
		setMoreOpen(false);
	}, [pathname]);

	return (
		<>
			<nav
				aria-label="Admin"
				className="fixed inset-x-0 bottom-0 z-nav border-t border-line bg-surface pb-safe-bottom xl:hidden"
			>
				<LayoutGroup id="admin-nav-mobile">
					<ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5 gap-1 px-2">
						{MOBILE_PRIMARY_NAV.map((item) => (
							<li key={item.href}>
								<MobileNavLink
									href={item.href}
									label={item.label}
									icon={item.icon}
									active={isActive(item.href)}
									count={badgeCount(counts, item.href)}
								/>
							</li>
						))}
						<li>
							<button
								ref={moreButtonRef}
								type="button"
								onClick={() => setMoreOpen((open) => !open)}
								aria-expanded={moreOpen}
								aria-haspopup="dialog"
								aria-controls="admin-more-tools"
								className={cn(
									TAB_CELL,
									moreOpen || moreActive
										? "bg-canvas text-accent-text"
										: "text-muted hover:text-ink",
								)}
							>
								<Ellipsis size={ICON_TAB} aria-hidden="true" />
								<span className={TAB_LABEL}>More</span>
							</button>
						</li>
					</ul>
				</LayoutGroup>
			</nav>

			{moreOpen ? (
				<>
					<button
						type="button"
						tabIndex={-1}
						aria-label="Close more tools"
						onClick={close}
						className="fixed inset-0 z-nav bg-scrim/40 dark:bg-scrim/60 xl:hidden starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-base)"
					/>
					<div
						id="admin-more-tools"
						role="dialog"
						aria-labelledby={sheetTitleId}
						className="fixed inset-x-3 bottom-[calc(var(--tabbar-offset)+var(--space-tight))] z-overlay mx-auto max-w-md rounded-(--radius-md) border border-line bg-surface-raised p-3 shadow-e5 xl:hidden starting:translate-y-3 starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
					>
						<div className="mb-2 flex items-start justify-between gap-3 px-3">
							<div className="min-w-0 py-2">
								<p id={sheetTitleId} className="text-sm font-semibold text-ink">
									More tools
								</p>
								<p className="truncate text-label text-muted">{email}</p>
							</div>
							<button
								type="button"
								onClick={close}
								aria-label="Close more tools"
								className={adminIconBtnGhost}
							>
								<X size={ICON_MD} aria-hidden="true" />
							</button>
						</div>
						{MORE_GROUPS.map((group, gi) => (
							<Fragment key={group[0]?.href ?? gi}>
								{gi > 0 ? <hr className="my-1 border-line" /> : null}
								<ul className="grid gap-1">
									{group.map((item, index) => {
										const active = isActive(item.href);
										return (
											<li key={item.href}>
												<Link
													ref={gi === 0 && index === 0 ? firstMoreLinkRef : undefined}
													href={item.href}
													onClick={() => setMoreOpen(false)}
													aria-current={active ? "page" : undefined}
													className={cn(
														"flex min-h-12 items-center gap-2 rounded-(--radius-sm) px-3 text-sm font-medium transition-ui pressable",
														active ? "bg-canvas text-accent-text" : "text-ink hover:bg-canvas",
													)}
												>
													<item.icon size={ICON_MD} aria-hidden="true" />
													{item.label}
												</Link>
											</li>
										);
									})}
								</ul>
							</Fragment>
						))}
					</div>
				</>
			) : null}
		</>
	);
}
