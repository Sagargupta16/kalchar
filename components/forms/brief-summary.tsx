"use client";

import { AlertCircle, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { IconCircle } from "@/components/ui/icon-circle";
import { DUR, EASE_OUT, SPRING_ZOOM } from "@/lib/motion";
import type { CustomOrderDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./use-custom-order-draft";

interface SummaryRow {
	key: string;
	label: string;
	value: string;
	/** Shown muted in place of the value while the visitor has not chosen. */
	placeholder: string;
}

/**
 * The live summary beside the brief: every answer reads back as it is typed
 * or picked, so the visitor sees the message taking shape before it goes to
 * WhatsApp. A row whose value changes cross-fades it in (keyed on the value,
 * a short rise at DUR.fast); empty rows show the neutral choice muted.
 */
export function BriefSummary({ rows }: Readonly<{ rows: readonly SummaryRow[] }>) {
	return (
		<dl className="divide-y divide-line">
			{rows.map((row) => (
				<div key={row.key} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3">
					<dt className="t-meta pt-0.5">{row.label}</dt>
					<dd className="min-w-0 text-sm">
						<AnimatePresence mode="popLayout" initial={false}>
							<motion.span
								key={row.value || "empty"}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast } }}
								transition={{ duration: DUR.base, ease: EASE_OUT }}
								className={cn(
									"block [overflow-wrap:anywhere]",
									row.key === "brief" && "line-clamp-3 whitespace-pre-line",
									row.value ? "font-medium text-ink" : "text-muted",
								)}
							>
								{row.value || row.placeholder}
							</motion.span>
						</AnimatePresence>
					</dd>
				</div>
			))}
		</dl>
	);
}

export function EnquiryStatus({
	saveStatus,
	draft,
}: Readonly<{
	saveStatus: SaveStatus;
	draft: CustomOrderDraft | null;
}>) {
	// Specific beats generic (forms-copy c1 success anatomy): echo the choices
	// the visitor made so the record reads back, skipping empty selections.
	const echo = draft
		? [
				draft.style,
				draft.size ? `around ${draft.size}` : null,
				draft.budget ? `budget ${draft.budget}` : null,
				draft.timeline,
			]
				.filter(Boolean)
				.join(", ")
		: "";
	return (
		<div aria-live="polite" aria-atomic="true">
			{saveStatus === "saving" ? (
				<p className="text-sm text-muted">Saving your brief. You can send it on WhatsApp now.</p>
			) : null}
			{saveStatus === "failed" ? (
				<p className="flex items-start gap-2 text-sm text-ruby" role="alert">
					<AlertCircle size={16} aria-hidden="true" className="mt-1 shrink-0" />
					<span>
						We couldn&rsquo;t confirm your enquiry was saved. Send it on WhatsApp or by email, or
						try saving again.
					</span>
				</p>
			) : null}
			{saveStatus === "saved" && draft ? (
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: DUR.base, ease: EASE_OUT }}
					className="flex items-start gap-3 rounded-(--radius-md) border border-(--section-accent)/40 bg-(--section-accent)/5 p-4"
				>
					{/* The check pops in on the zoom spring (a response to the visitor's tap, no bounce). */}
					<motion.span
						initial={{ scale: 0.6 }}
						animate={{ scale: 1 }}
						transition={SPRING_ZOOM}
						className="flex shrink-0"
					>
						<IconCircle size="sm" className="bg-(--section-accent) text-bg ring-0">
							<Check size={14} />
						</IconCircle>
					</motion.span>
					<div>
						<p className="text-sm font-medium text-ink">Your enquiry is saved.</p>
						{echo ? <p className="mt-1 text-sm text-muted">{echo}.</p> : null}
						<p className="mt-1 text-sm text-muted">
							{draft.contact
								? "We'll use your contact details to reply. You can also send your message on WhatsApp."
								: "Send it on WhatsApp or email so we have a way to reply."}
						</p>
					</div>
				</motion.div>
			) : null}
		</div>
	);
}
