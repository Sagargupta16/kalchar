"use client";

import { AnimatePresence, motion } from "motion/react";
import { formatLeadShortDate, leadInitials, leadSnippet } from "@/lib/lead-triage";
import { DUR } from "@/lib/motion";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInitialsDisc, adminRow } from "./controls";

/**
 * One enquiry as a DM-style inbox row (visual-direction-admin Tier 2a): the
 * initials disc, the name carrying the one quiet unread signal set (accent dot
 * plus semibold, D-A7: no ring), a single truncating snippet line, and the
 * short date right-aligned in a fixed w-14 column so every row's date edge
 * lines up (1.11). The whole row is one button opening the enquiry; opening
 * never mutates (an open is not a reply). Press cue only, no hover lift.
 */
export function LeadRow({
	lead,
	selected,
	disabled = false,
	pending = false,
	onOpen,
}: Readonly<{
	lead: Lead;
	selected: boolean;
	disabled?: boolean;
	pending?: boolean;
	onOpen: () => void;
}>) {
	const who = lead.name?.trim() || "Someone";
	const isNew = lead.status === "new";
	return (
		<li>
			<button
				type="button"
				disabled={disabled}
				aria-busy={pending || undefined}
				onClick={onOpen}
				aria-expanded={selected}
				className={cn(
					adminRow,
					"grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left pressable disabled:pointer-events-none disabled:opacity-50",
					selected && "border-accent",
				)}
			>
				<span aria-hidden="true" className={cn(adminInitialsDisc, "size-control")}>
					{leadInitials(who)}
				</span>
				<span className="min-w-0">
					<span className="flex items-center gap-1.5">
						<AnimatePresence initial={false}>
							{isNew ? (
								// The dot fades out at fast when the row leaves New (Tier 2a motion).
								<motion.span
									aria-hidden="true"
									exit={{ opacity: 0 }}
									transition={{ duration: DUR.fast }}
									className="size-2 shrink-0 rounded-full bg-accent"
								/>
							) : null}
						</AnimatePresence>
						<span
							className={cn("truncate text-sm text-ink", isNew ? "font-semibold" : "font-medium")}
						>
							{who}
						</span>
						{isNew ? <span className="sr-only">, new</span> : null}
					</span>
					<span className="mt-1 block truncate text-label text-muted">{leadSnippet(lead)}</span>
				</span>
				{/* The stamp is relative to render time; the server and client prints may differ by a minute. */}
				<span
					suppressHydrationWarning
					className="w-14 shrink-0 self-start pt-1 text-right text-micro text-muted tabular-nums"
				>
					{formatLeadShortDate(lead.createdAt)}
				</span>
			</button>
		</li>
	);
}
