"use client";

import { Ellipsis, Plus, X } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
	DUR,
	EASE_IN,
	PRESS_SCALE,
	SPRING_INDICATOR,
	SPRING_PANEL,
	SPRING_PRESS,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAddSheet } from "./add-sheet";
import {
	ADMIN_NAV_GROUPS,
	badgeCount,
	badgeName,
	CountPill,
	type NavCounts,
	useAddContext,
	useIsActive,
} from "./admin-nav-shared";
import { adminIconBtnGhost, ICON_MD, ICON_TAB } from "./controls";
import { MODAL_EXIT_MS } from "./modal";

export { AdminNavDesktop } from "./admin-nav-desktop";
export type { NavCounts } from "./admin-nav-shared";

const NAV = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
const MOBILE_PRIMARY_HREFS = new Set(["/admin", "/admin/events", "/admin/leads"]);
const MOBILE_PRIMARY_NAV = NAV.filter((item) => MOBILE_PRIMARY_HREFS.has(item.href));
const MOBILE_MORE_NAV = NAV.filter((item) => !MOBILE_PRIMARY_HREFS.has(item.href));
const MORE_GROUPS = ADMIN_NAV_GROUPS.map((group) => ({
	...group,
	items: group.items.filter((item) => !MOBILE_PRIMARY_HREFS.has(item.href)),
})).filter((group) => group.items.length > 0);

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
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			aria-label={badgeName(label, count)}
			onClick={(event) => {
				// Re-tapping the active tab resets scroll instead of re-navigating.
				if (!active) return;
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: "smooth" });
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

/**
 * The raised Add cell (1.3): a terracotta size-fab disc on a material-glass
 * collar (steering 2026-09-14: translucent surface tint + static blur +
 * hairline + e2, opaque fallback), lifted out of the bar, one hit target with
 * the label. Motion owns every transform on the button (never pair with CSS
 * pressable); the Plus rotates to an X on SPRING_INDICATOR while an add
 * surface is open. The accent
 * disc dips e3 -> e2 while pressed (shadow only; Motion keeps the transform).
 * Focus draws the standard 2px accent ring around the round disc at 3px
 * offset (1.3 focus note), not around the rectangular cell; outline-hidden
 * keeps the forced-colors fallback that outline-none would drop.
 */
function RaisedAddCell() {
	const addContext = useAddContext();
	const { openPiece, openEvent, openChoice, addOpen } = useAddSheet();
	const addActions = { piece: openPiece, event: openEvent, choice: openChoice };
	const addLabels = { piece: "Add a piece", event: "Add an event", choice: "Add" };
	return (
		<motion.button
			type="button"
			whileTap={{ scale: PRESS_SCALE }}
			transition={SPRING_PRESS}
			onClick={addActions[addContext]}
			aria-label={addLabels[addContext]}
			aria-haspopup={addContext === "choice" ? "dialog" : undefined}
			className="group relative flex h-full w-full flex-col items-center justify-end pb-1 outline-hidden"
		>
			<span
				aria-hidden="true"
				className="grid size-[4.25rem] -translate-y-4 place-items-center rounded-full material-glass"
			>
				<span className="grid size-fab place-items-center rounded-full bg-accent text-bg shadow-e3 transition-shadow group-active:shadow-e2 group-focus-visible:outline-2 group-focus-visible:outline-accent group-focus-visible:outline-offset-3">
					<motion.span
						className="grid"
						initial={false}
						animate={{ rotate: addOpen ? 45 : 0 }}
						transition={SPRING_INDICATOR}
					>
						<Plus size={24} />
					</motion.span>
				</span>
			</span>
			<span className={cn("absolute bottom-1 font-medium text-muted", TAB_LABEL)}>Add</span>
		</motion.button>
	);
}

/** Compact mobile/tablet navigation with secondary tools behind one sheet. */
export function AdminNavMobile({
	email,
	counts,
	signOut,
}: Readonly<{ email: string; counts?: NavCounts; signOut?: ReactNode }>) {
	const isActive = useIsActive();
	const pathname = usePathname();
	const sheetTitleId = useId();
	const [morePhase, setMorePhase] = useState<"closed" | "open" | "closing">("closed");
	const moreButtonRef = useRef<HTMLButtonElement>(null);
	const firstMoreLinkRef = useRef<HTMLAnchorElement>(null);
	const moreSheetRef = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<number | null>(null);
	const moreOpen = morePhase === "open";
	const moreActive = MOBILE_MORE_NAV.some((item) => isActive(item.href));

	// A4: the sheet and scrim exit at fast/ease-in before unmount; a route
	// change unmounts at once. The sheet itself is Motion
	// (SPRING_PANEL settle in, DUR.fast EASE_IN tween out, steering 2026-09-14);
	// the scrim keeps the CSS fade below.
	const close = useCallback(() => {
		if (closeTimer.current !== null) return;
		moreButtonRef.current?.focus();
		setMorePhase("closing");
		closeTimer.current = window.setTimeout(() => {
			closeTimer.current = null;
			setMorePhase("closed");
		}, MODAL_EXIT_MS);
	}, []);

	useEffect(() => {
		return () => {
			if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
		};
	}, []);

	useEffect(() => {
		if (morePhase !== "open") return;
		firstMoreLinkRef.current?.focus();
	}, [morePhase]);

	// Hardware Back / any route change closes the sheet.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value we read
	useEffect(() => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
		setMorePhase("closed");
	}, [pathname]);

	useEffect(() => {
		if (!moreOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close();
				return;
			}
			if (event.key !== "Tab") return;
			const controls = moreSheetRef.current?.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), [tabindex="0"]',
			);
			const first = controls?.[0];
			const last = controls?.[controls.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [moreOpen, close]);

	useEffect(() => {
		if (morePhase === "closed") return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const desktop = window.matchMedia("(min-width: 80rem)");
		const closeOnDesktop = () => {
			if (!desktop.matches) return;
			setMorePhase("closed");
			document
				.querySelector<HTMLElement>('#admin-desktop-navigation [aria-current="page"]')
				?.focus();
		};
		desktop.addEventListener("change", closeOnDesktop);
		return () => {
			document.body.style.overflow = previousOverflow;
			desktop.removeEventListener("change", closeOnDesktop);
		};
	}, [morePhase]);

	const closingClasses =
		morePhase === "closing" ? "opacity-0 duration-(--duration-fast) ease-(--ease-in)" : undefined;

	return (
		<>
			<nav
				aria-label="Admin"
				className="fixed inset-x-0 bottom-0 z-nav border-t border-line material-glass pb-safe-bottom xl:hidden"
			>
				<LayoutGroup id="admin-nav-mobile">
					<ul className="mx-auto grid h-tabbar max-w-lg grid-cols-5 gap-1 px-2">
						{MOBILE_PRIMARY_NAV.slice(0, 2).map((item) => (
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
							<RaisedAddCell />
						</li>
						{MOBILE_PRIMARY_NAV.slice(2).map((item) => (
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
								onClick={() => (moreOpen ? close() : setMorePhase("open"))}
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

			{morePhase !== "closed" ? (
				<>
					<button
						type="button"
						tabIndex={-1}
						aria-label="Close more tools"
						onClick={() => close()}
						className={cn(
							"fixed inset-0 z-nav bg-scrim/40 dark:bg-scrim/60 xl:hidden starting:opacity-0 transition-opacity duration-(--duration-base)",
							closingClasses,
						)}
					/>
					<motion.div
						ref={moreSheetRef}
						id="admin-more-tools"
						role="dialog"
						aria-modal="true"
						aria-labelledby={sheetTitleId}
						initial={{ opacity: 0, y: 12 }}
						animate={morePhase === "closing" ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
						transition={
							morePhase === "closing" ? { duration: DUR.fast, ease: EASE_IN } : SPRING_PANEL
						}
						className="fixed inset-x-3 bottom-[calc(var(--tabbar-offset)+var(--space-tight))] z-overlay mx-auto max-h-[calc(100dvh-var(--tabbar-offset)-var(--space-group))] max-w-md overflow-y-auto overscroll-contain rounded-(--radius-md) material-glass-strong p-3 xl:hidden"
					>
						<div className="mb-4 flex items-start justify-between gap-3 px-3">
							<div className="min-w-0 py-2">
								<p id={sheetTitleId} className="text-sm font-semibold text-ink">
									More tools
								</p>
								<p className="truncate text-label text-muted">{email}</p>
							</div>
							<button
								type="button"
								onClick={() => close()}
								aria-label="Close more tools"
								className={adminIconBtnGhost}
							>
								<X size={ICON_MD} aria-hidden="true" />
							</button>
						</div>
						{MORE_GROUPS.map((group, gi) => (
							<div key={group.label} className="py-2">
								<p className="px-3 pb-1 text-label font-medium text-muted">{group.label}</p>
								<ul aria-label={group.label} className="grid gap-1">
									{group.items.map((item, index) => {
										const active = isActive(item.href);
										return (
											<li key={item.href}>
												<Link
													ref={gi === 0 && index === 0 ? firstMoreLinkRef : undefined}
													href={item.href}
													onClick={() => setMorePhase("closed")}
													aria-current={active ? "page" : undefined}
													className={cn(
														"flex min-h-control items-center gap-3 rounded-(--radius-sm) px-3 text-sm font-medium transition-ui pressable",
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
							</div>
						))}
						<div className="mt-2 flex items-center justify-between gap-3 pt-2">
							<ThemeToggle compact />
							{signOut}
						</div>
					</motion.div>
				</>
			) : null}
		</>
	);
}
