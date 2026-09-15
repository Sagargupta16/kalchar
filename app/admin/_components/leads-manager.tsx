"use client";

import { useEffect, useOptimistic, useRef, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LEAD_STATUS_LABEL } from "@/lib/lead-triage";
import type { Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteLead, setLeadStatus } from "../lead-actions";
import { AdminNotice } from "./admin-notice";
import { adminBtn } from "./controls";
import { LeadPane, LeadSheet } from "./lead-detail";
import { LeadRow } from "./lead-row";
import { UndoBar, useUndo } from "./undo-bar";
import { useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

type Lens = "all" | LeadStatus;

const LENS_LABEL: Record<Lens, string> = { all: "All", ...LEAD_STATUS_LABEL };
/** Chip order per the Tier 2a composition: New first, All last. Only New carries its count. */
const LENSES: readonly Lens[] = ["new", "contacted", "closed", "all"];

/**
 * The split-pane breakpoint, kept in sync with the lg: classes on the grid
 * below (Tailwind lg = 64rem). Local per BUILD-RULES: no shared media-query
 * hook exists and lib/hooks is not owned here.
 */
const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeToDesktop(onChange: () => void): () => void {
	const query = window.matchMedia(DESKTOP_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/** False on the server: the phone sheet is the default until the client measures. */
function useIsDesktop(): boolean {
	return useSyncExternalStore(
		subscribeToDesktop,
		() => window.matchMedia(DESKTOP_QUERY).matches,
		() => false,
	);
}

/** Mirror the selection into ?lead= so a triage position is shareable (Tier 2a). */
function setLeadParam(id: string | null) {
	try {
		const url = new URL(window.location.href);
		if (id) url.searchParams.set("lead", id);
		else url.searchParams.delete("lead");
		window.history.replaceState(window.history.state, "", url);
	} catch {
		// A host without a rewritable URL (the component harness): selection still works in state.
	}
}

/**
 * The enquiries DM inbox (visual-direction-admin Tier 2a): rows open a
 * full-detent sheet on phones and an inline pane from lg, status lives in the
 * detail as a Segmented control whose flips are optimistic with an Undo offer
 * (D26, D37), and delete is the confirmed PII-removal path. Failures render
 * inside the enquiry they belong to.
 */
export function LeadsManager({
	leads: initial,
	siteName = "Kalchar",
	initialLeadId = null,
}: Readonly<{ leads: Lead[]; siteName?: string; initialLeadId?: string | null }>) {
	const { pending, err, run } = useAdminAction();
	const [leads, setLeads] = useServerSyncedList(initial);
	const [failedId, setFailedId] = useState<string | null>(null);
	const [lens, setLens] = useState<Lens>("all");
	const [selectedId, setSelectedId] = useState<string | null>(initialLeadId);
	const inboxRef = useRef<HTMLElement>(null);
	const restoreInboxFocus = useRef(false);
	const isDesktop = useIsDesktop();
	// The sheet is a modal dialog, so it mounts only after the client has
	// measured the viewport; the pane column is CSS-hidden below lg.
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(run);
	// Status flips paint before the round trip; the value reverts by itself on
	// failure because the dispatch runs inside run()'s transition (React 19).
	const [shownLeads, applyStatus] = useOptimistic(
		leads,
		(state: Lead[], patch: { id: string; status: LeadStatus }) =>
			state.map((l) => (l.id === patch.id ? { ...l, status: patch.status } : l)),
	);

	useEffect(() => {
		if (pending || selectedId !== null || !restoreInboxFocus.current) return;
		restoreInboxFocus.current = false;
		const filter = inboxRef.current?.querySelector<HTMLButtonElement>(
			'button[aria-pressed="true"]',
		);
		(filter ?? inboxRef.current)?.focus();
	}, [pending, selectedId]);

	const select = (id: string | null) => {
		setSelectedId(id);
		setLeadParam(id);
	};

	/** Run a mutation and remember which enquiry it belongs to, for error routing. */
	const act = (id: string, fn: () => Promise<unknown>, after?: () => void) => {
		if (pending) return Promise.resolve(false);
		dismissUndo();
		setFailedId(null);
		return run(fn, after).then((ok) => {
			if (!ok) setFailedId(id);
			return ok;
		});
	};

	const onStatus = (id: string, status: LeadStatus) => {
		if (pending) return Promise.resolve(false);
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
				if (lens !== "all" && status !== lens) {
					restoreInboxFocus.current = true;
					if (isDesktop) select(null);
				}
				offerUndo({
					message: `Enquiry from ${who} marked ${LEAD_STATUS_LABEL[status].toLowerCase()}`,
					// The RAW reverse action: wrapping it in the same run() would trip the
					// inFlight guard. The optimistic dispatch is legal inside run's transition.
					action: async () => {
						applyStatus({ id, status: previous });
						const result = await setLeadStatus(id, previous);
						if (result.ok) {
							setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: previous } : l)));
						}
						return result;
					},
				});
			},
		);
	};

	/**
	 * A successful flip from the phone sheet also closes it: the full-height
	 * sheet sits in the top layer, which leaves the Undo toast underneath
	 * inert, so the offer is only reachable back on the inbox. Failures keep
	 * the sheet open with the error inline.
	 */
	const onStatusFromSheet = async (id: string, status: LeadStatus) => {
		const ok = await onStatus(id, status);
		if (ok) select(null);
		return ok;
	};

	const onDelete = (lead: Lead) =>
		act(
			lead.id,
			() => deleteLead(lead.id),
			() => {
				setLeads((prev) => prev.filter((l) => l.id !== lead.id));
				restoreInboxFocus.current = true;
				select(null);
			},
		);

	const counts = shownLeads.reduce<Record<Lens, number>>(
		(acc, l) => {
			acc.all += 1;
			acc[l.status] += 1;
			return acc;
		},
		{ all: 0, new: 0, contacted: 0, closed: 0 },
	);
	// Keep the active row and its detail mounted until the status result arrives.
	const shown = shownLeads.filter(
		(l) => lens === "all" || l.status === lens || (pending && l.id === selectedId),
	);
	const selectedLead = shownLeads.find((l) => l.id === selectedId) ?? null;

	const detailProps = selectedLead
		? {
				lead: selectedLead,
				siteName,
				pending,
				error: failedId === selectedLead.id ? err : null,
				onDelete: () => onDelete(selectedLead),
			}
		: null;

	return (
		<section ref={inboxRef} aria-label="Enquiry inbox" tabIndex={-1} className="space-y-group">
			{leads.length > 0 ? (
				<div role="group" aria-label="Filter enquiries" className="flex flex-wrap gap-2">
					{LENSES.map((key) => (
						<button
							key={key}
							type="button"
							disabled={pending}
							aria-pressed={lens === key}
							// Adjacent text and span concatenate to "New2" in the accessible
							// name; the label keeps the space ("New 2").
							aria-label={key === "new" ? `${LENS_LABEL.new} ${counts.new}` : undefined}
							onClick={() => {
								setLens(key);
								if (key !== "all" && selectedLead?.status !== key) select(null);
							}}
							className={cn(adminBtn, "rounded-full")}
						>
							{LENS_LABEL[key]}
							{key === "new" ? (
								<span aria-hidden="true" className="text-muted tabular-nums">
									{counts.new}
								</span>
							) : null}
						</button>
					))}
				</div>
			) : null}
			{err && failedId !== null && failedId !== selectedId ? (
				<AdminNotice variant="error">{err}</AdminNotice>
			) : null}
			{leads.length === 0 ? (
				<EmptyState
					variant="compact"
					voice="tool"
					title="No enquiries yet"
					body="New enquiries from the site appear here."
				/>
			) : null}
			{shown.length === 0 && leads.length > 0 ? (
				lens === "new" ? (
					<EmptyState
						variant="compact"
						voice="tool"
						title="All caught up"
						body="No new enquiries on this page. Show all to review the others."
						action={
							<button type="button" onClick={() => setLens("all")} className={adminBtn}>
								Show all
							</button>
						}
					/>
				) : (
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
				)
			) : null}
			{shown.length > 0 ? (
				<div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-(--space-page)">
					<ul className="space-y-tight lg:col-span-5">
						{shown.map((lead) => (
							<LeadRow
								key={lead.id}
								lead={lead}
								selected={lead.id === selectedId}
								disabled={pending}
								pending={pending && lead.id === selectedId}
								onOpen={() => select(lead.id)}
							/>
						))}
					</ul>
					<div className="hidden lg:block lg:col-span-7">
						{detailProps && isDesktop ? (
							<LeadPane
								key={detailProps.lead.id}
								{...detailProps}
								onStatus={(status) => onStatus(detailProps.lead.id, status)}
							/>
						) : (
							<EmptyState
								variant="compact"
								voice="tool"
								body="Select an enquiry to read and reply."
							/>
						)}
					</div>
				</div>
			) : null}
			{hydrated && !isDesktop && detailProps ? (
				<LeadSheet
					key={detailProps.lead.id}
					{...detailProps}
					onStatus={(status) => onStatusFromSheet(detailProps.lead.id, status)}
					onClose={() => select(null)}
				/>
			) : null}
			{undo ? (
				<UndoBar
					message={undo.message}
					pending={pending || undoPending}
					error={undoError ? (err ?? undoError) : null}
					onAction={() => {
						setFailedId(null);
						return undoNow();
					}}
					onDismiss={dismissUndo}
				/>
			) : null}
		</section>
	);
}
