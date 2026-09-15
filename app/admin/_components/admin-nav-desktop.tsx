"use client";

import { ChevronDown, Plus } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { SPRING_INDICATOR } from "@/lib/motion";
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
import { adminBtn, adminBtnPrimary, ICON_MD } from "./controls";

/** Add stays visible while the grouped destinations scroll on shorter screens. */
export function AdminNavDesktop({ counts }: Readonly<{ counts?: NavCounts }> = {}) {
	const isActive = useIsActive();
	const addContext = useAddContext();
	const { openPiece, openEvent, openChoice } = useAddSheet();
	const addActions = { piece: openPiece, event: openEvent, choice: openChoice };
	const addLabels = { piece: "Add piece", event: "Add event", choice: "Add" };

	return (
		<nav
			id="admin-desktop-navigation"
			aria-label="Admin"
			className="flex min-h-0 flex-col gap-(--space-group)"
		>
			<div className="flex shrink-0 gap-2 px-1 pt-1">
				<button
					type="button"
					onClick={addActions[addContext]}
					aria-haspopup={addContext === "event" ? undefined : "dialog"}
					className={cn(adminBtnPrimary, "min-w-0 flex-1")}
				>
					<Plus size={ICON_MD} aria-hidden="true" className="shrink-0" />
					{addLabels[addContext]}
				</button>
				{addContext !== "choice" ? (
					<button
						type="button"
						onClick={openChoice}
						aria-label="Add other content"
						title="Add other content"
						aria-haspopup="dialog"
						className={cn(adminBtn, "size-control shrink-0 p-0")}
					>
						<ChevronDown size={ICON_MD} aria-hidden="true" />
					</button>
				) : null}
			</div>
			<div className="min-h-0 space-y-group overflow-y-auto overscroll-contain px-1 pb-1">
				<LayoutGroup id="admin-nav-desktop">
					{ADMIN_NAV_GROUPS.map((group) => (
						<div key={group.label}>
							<p className="mb-1 px-3 text-label font-medium text-muted">{group.label}</p>
							<ul aria-label={group.label} className="space-y-1">
								{group.items.map((item) => {
									const active = isActive(item.href);
									const count = badgeCount(counts, item.href);
									return (
										<li key={item.href}>
											<Link
												href={item.href}
												aria-current={active ? "page" : undefined}
												aria-label={badgeName(item.label, count)}
												className={cn(
													"relative isolate flex min-h-control items-center gap-3 rounded-(--radius-sm) px-3 py-2 text-sm transition-ui pressable",
													active
														? "font-semibold text-accent-text"
														: "font-medium text-muted hover:bg-bg-muted hover:text-ink",
												)}
											>
												{active ? (
													<motion.span
														layoutId="admin-nav-active"
														aria-hidden="true"
														className="absolute inset-0 -z-10 rounded-(--radius-sm) bg-surface"
														transition={SPRING_INDICATOR}
													/>
												) : null}
												<item.icon size={ICON_MD} aria-hidden="true" className="shrink-0" />
												<span className="min-w-0 flex-1">{item.label}</span>
												{count > 0 ? <CountPill count={count} className="shrink-0" /> : null}
											</Link>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</LayoutGroup>
			</div>
		</nav>
	);
}
