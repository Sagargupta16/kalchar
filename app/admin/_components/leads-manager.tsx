"use client";

import { useOptimistic, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/lead-triage";
import type { Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteLead, setLeadStatus } from "../lead-actions";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import { adminBtn } from "./controls";
import { LeadCard } from "./lead-card";
import { UndoBar, useUndo } from "./undo-bar";
import { useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

type Lens = "all" | LeadStatus;

const LENS_LABEL: Record<Lens, string> = { all: "All", ...LEAD_STATUS_LABEL };

/**
 * Admin queue for captured custom-order enquiries. Each card shows the brief,
 * the chosen options, one-tap reply links, a status select whose flips are
 * optimistic with an Undo offer (D26), and a delete control (the PII-removal
 * path). Failures render inside the card they belong to.
 */
export function LeadsManager({
	leads: initial,
	siteName = "Kalchar",
}: Readonly<{ leads: Lead[]; siteName?: string }>) {
	const { pending, err, run } = useAdminAction();
	const [leads, setLeads] = useServerSyncedList(initial);
	const confirm = useConfirm();
	const [failedId, setFailedId] = useState<string | null>(null);
	const [lens, setLens] = useState<Lens>("all");
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(run);
	// Status flips paint before the round trip; the value reverts by itself on
	// failure because the dispatch runs inside run()'s transition (React 19).
	const [shownLeads, applyStatus] = useOptimistic(
		leads,
		(state: Lead[], patch: { id: string; status: LeadStatus }) =>
			state.map((l) => (l.id === patch.id ? { ...l, status: patch.status } : l)),
	);

	/** Run a mutation and remember which card it belongs to, for error routing. */
	const act = (id: string, fn: () => Promise<unknown>, after?: () => void) => {
		setFailedId(null);
		return run(fn, after).then((ok) => {
			if (!ok) setFailedId(id);
			return ok;
		});
	};

	const onStatus = (id: string, status: LeadStatus) => {
		const lead = leads.find((l) => l.id === id);
		if (!lead || lead.status === status) return Promise.resolve(true);
		const previous = lead.status;
		const who = lead.name?.trim() || "Someone";
		return act(
			id,
			async () => {
				applyStatus({ id, status });
				return setLeadStatus(id, status);
			},
			() => {
				setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
				offerUndo({
					message: `Enquiry from ${who} marked ${LEAD_STATUS_LABEL[status].toLowerCase()}`,
					// The RAW reverse action: wrapping it in the same run() would trip the
					// inFlight guard. The optimistic dispatch is legal inside run's transition.
					action: async () => {
						applyStatus({ id, status: previous });
						return setLeadStatus(id, previous);
					},
				});
			},
		);
	};

	const onDelete = async (lead: Lead) => {
		const ok = await confirm({
			title: `Delete the enquiry from ${lead.name || "this visitor"}?`,
			body: "This permanently removes the enquiry and the contact details it holds.",
			confirmLabel: "Delete enquiry",
			cancelLabel: "Keep enquiry",
		});
		if (!ok) return;
		act(
			lead.id,
			() => deleteLead(lead.id),
			() => setLeads((prev) => prev.filter((l) => l.id !== lead.id)),
		);
	};

	const counts = shownLeads.reduce<Record<Lens, number>>(
		(acc, l) => {
			acc.all += 1;
			acc[l.status] += 1;
			return acc;
		},
		{ all: 0, new: 0, contacted: 0, closed: 0 },
	);
	const shown = lens === "all" ? shownLeads : shownLeads.filter((l) => l.status === lens);

	return (
		<div className="space-y-group">
			{leads.length > 0 ? (
				<div role="group" aria-label="Filter enquiries" className="flex flex-wrap gap-2">
					{(["all", ...LEAD_STATUSES] as Lens[]).map((key) => (
						<button
							key={key}
							type="button"
							aria-pressed={lens === key}
							onClick={() => setLens(key)}
							className={cn(adminBtn, "rounded-full")}
						>
							{LENS_LABEL[key]} <span className="tabular-nums text-muted">{counts[key]}</span>
						</button>
					))}
				</div>
			) : null}
			{err && !undo && (failedId === null || !shown.some((l) => l.id === failedId)) ? (
				<AdminNotice variant="error">{err}</AdminNotice>
			) : null}
			{leads.length === 0 ? (
				<EmptyState variant="compact" voice="tool">
					No enquiries on this page. Briefs sent from the custom-order form appear here.
				</EmptyState>
			) : null}
			{shown.length === 0 && leads.length > 0 ? (
				<EmptyState
					variant="compact"
					voice="tool"
					body={`No ${LENS_LABEL[lens].toLowerCase()} enquiries on this page.`}
					action={
						<button type="button" onClick={() => setLens("all")} className={adminBtn}>
							Show all
						</button>
					}
				/>
			) : null}
			{shown.length > 0 ? (
				<ul className="space-y-tight">
					{shown.map((lead) => (
						<LeadCard
							key={lead.id}
							lead={lead}
							siteName={siteName}
							pending={pending}
							error={failedId === lead.id ? err : null}
							onStatus={(status) => onStatus(lead.id, status)}
							onDelete={() => onDelete(lead)}
						/>
					))}
				</ul>
			) : null}
			{undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError ? (err ?? undoError) : null}
					onAction={undoNow}
					onDismiss={dismissUndo}
				/>
			) : null}
		</div>
	);
}
