"use client";

import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	formatLeadTimestamp,
	LEAD_STATUS_LABEL,
	leadReplyLinks,
	parseLeadContact,
} from "@/lib/lead-triage";
import type { Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { ConfirmPanel } from "./confirm-dialog";
import {
	adminBtn,
	adminBtnDestructive,
	adminBtnPrimary,
	adminField,
	adminLabel,
	adminPanel,
	adminSectionTitle,
} from "./controls";
import { Modal, ModalBody, ModalFooter, useModalExit } from "./modal";
import { Segmented, type SegmentedOption } from "./segmented";

/** How long "Email copied" stays before the label reverts. A UX hold, not a motion token. */
const EMAIL_COPIED_MS = 2000;

/**
 * Status segments (1.8). New keeps the accent dot: terracotta is the one
 * sanctioned attention colour for a new enquiry, matching the tab badge and
 * the unread row dot; the other two use the status tokens.
 */
const STATUS_OPTIONS: readonly SegmentedOption<LeadStatus>[] = [
	{ value: "new", label: LEAD_STATUS_LABEL.new, dotClass: "bg-accent" },
	{ value: "contacted", label: LEAD_STATUS_LABEL.contacted, dotClass: "bg-status-available" },
	{ value: "closed", label: LEAD_STATUS_LABEL.closed, dotClass: "bg-status-nfs" },
];

interface LeadDetailProps {
	lead: Lead;
	siteName: string;
	pending: boolean;
	error: string | null;
	/** Applies at once (D37); the manager reports success so the sheet can close. */
	onStatus: (status: LeadStatus) => Promise<boolean>;
	/** The raw delete, already routed through the manager's run(); confirmed here inline (1.10). */
	onDelete: () => Promise<boolean>;
}

function leadName(lead: Lead): string {
	return lead.name?.trim() || "Someone";
}

function useLeadDeleteConfirmation(pending: boolean) {
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const deleteButtonRef = useRef<HTMLButtonElement>(null);
	const restoreDeleteFocus = useRef(false);

	useEffect(() => {
		if (!confirmingDelete && restoreDeleteFocus.current) {
			restoreDeleteFocus.current = false;
			deleteButtonRef.current?.focus();
		}
	}, [confirmingDelete]);

	return {
		confirmingDelete,
		deleteButtonRef,
		requestDelete: () => {
			if (!pending) setConfirmingDelete(true);
		},
		cancelDelete: () => {
			if (pending) return;
			restoreDeleteFocus.current = true;
			setConfirmingDelete(false);
		},
	};
}

/** The enquiry body shared by the phone sheet and the desktop pane. */
function LeadDetailContent({
	lead,
	pending,
	error,
	onStatus,
	onRequestDelete,
	deleteButtonRef,
}: Readonly<
	Omit<LeadDetailProps, "siteName" | "onDelete"> & {
		onRequestDelete: () => void;
		deleteButtonRef: RefObject<HTMLButtonElement | null>;
	}
>) {
	const who = leadName(lead);
	const chips = Object.entries({
		style: lead.style,
		size: lead.size,
		budget: lead.budget,
		timeline: lead.timeline,
	}).filter(([, value]) => Boolean(value));
	return (
		<div className="space-y-group" aria-busy={pending || undefined}>
			<Segmented
				name={`lead-status-${lead.id}`}
				label={`Status of the enquiry from ${who}`}
				value={lead.status}
				options={STATUS_OPTIONS}
				disabled={pending}
				onChange={(status) => void onStatus(status)}
			/>
			{error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
			{chips.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{chips.map(([field, chip]) => (
						<Badge key={field} variant="muted" className="min-h-6 max-w-full wrap-anywhere">
							{chip}
						</Badge>
					))}
				</div>
			) : null}
			<p className="max-w-(--prose-max) whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
				{lead.brief}
			</p>
			<div className="space-y-1">
				<p className="text-label text-muted tabular-nums">
					Received {formatLeadTimestamp(lead.createdAt)}
				</p>
				{lead.contact ? (
					<p className="select-all break-words text-label text-muted tabular-nums">
						Contact: {lead.contact}
					</p>
				) : null}
			</div>
			<div className="border-t border-line pt-(--space-group)">
				<button
					ref={deleteButtonRef}
					type="button"
					disabled={pending}
					onClick={onRequestDelete}
					aria-label={`Delete enquiry from ${who}`}
					className={cn(adminBtnDestructive, "w-full sm:w-auto")}
				>
					Delete enquiry
				</button>
			</div>
		</div>
	);
}

/** Clipboard permissions can be denied; the caller then offers native manual copying. */
async function writeClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/**
 * Keep the address inside the active dialog so native Copy works even when
 * clipboard-write is unavailable. Opening this fallback leaves focus on the
 * Copy button; tabbing or tapping into the field selects the whole address.
 */
function ManualEmailCopy({ email }: Readonly<{ email: string }>) {
	const hintId = useId();
	return (
		<div className="grid w-full min-w-0 gap-2">
			<AdminNotice id={hintId} variant="error">
				Could not copy the email. Select the address below, then use your device&apos;s Copy
				command.
			</AdminNotice>
			<label className={adminLabel}>
				<span>Email address to copy</span>
				<input
					type="text"
					value={email}
					readOnly
					aria-describedby={hintId}
					onFocus={(event) => event.currentTarget.select()}
					onClick={(event) => event.currentTarget.select()}
					className={cn(adminField, "select-all")}
				/>
			</label>
		</div>
	);
}

/**
 * Reply on WhatsApp (primary, prefilled greeting; only when the contact parses
 * as a phone) and Copy email (only when it parses as an email; the label swaps
 * to "Email copied" for two seconds). Tapping Reply also marks a new enquiry
 * Contacted, because that is what happened (D-A8); Undo rides the toast.
 */
function LeadReplyActions({
	lead,
	siteName,
	pending,
	onStatus,
}: Readonly<Pick<LeadDetailProps, "lead" | "siteName" | "pending" | "onStatus">>) {
	const [copied, setCopied] = useState(false);
	const [copyFailed, setCopyFailed] = useState(false);
	const timer = useRef<number | null>(null);
	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	const whatsapp = leadReplyLinks(lead, siteName).find((link) => link.kind === "whatsapp");
	const { email } = parseLeadContact(lead.contact);
	if (!whatsapp && !email) return null;

	const copyEmail = async () => {
		if (!email) return;
		setCopyFailed(false);
		if (!(await writeClipboard(email))) {
			setCopied(false);
			setCopyFailed(true);
			return;
		}
		setCopied(true);
		if (timer.current !== null) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setCopied(false), EMAIL_COPIED_MS);
	};

	return (
		<div className="flex w-full flex-wrap items-center gap-3">
			{whatsapp ? (
				<a
					href={whatsapp.href}
					target="_blank"
					rel="noopener noreferrer"
					aria-disabled={pending || undefined}
					tabIndex={pending ? -1 : undefined}
					onClick={(event) => {
						if (pending) {
							event.preventDefault();
							return;
						}
						if (lead.status === "new") void onStatus("contacted");
					}}
					className={cn(
						adminBtnPrimary,
						"flex-1 aria-disabled:pointer-events-none aria-disabled:opacity-50",
					)}
				>
					Reply on WhatsApp
				</a>
			) : null}
			{email ? (
				<button
					type="button"
					onClick={() => void copyEmail()}
					className={cn(adminBtn, !whatsapp && "flex-1")}
				>
					{copied ? "Email copied" : "Copy email"}
				</button>
			) : null}
			<output className="sr-only">{copied ? "Email copied" : ""}</output>
			{copyFailed && email ? <ManualEmailCopy email={email} /> : null}
		</div>
	);
}

const DELETE_CONFIRM = {
	body: "This permanently removes the enquiry and the details it holds.",
	confirmLabel: "Delete enquiry",
	cancelLabel: "Keep enquiry",
} as const;

/** Phone enquiry sheet: full detent, titled with the name, reply CTAs pinned above the safe area. */
export function LeadSheet({
	lead,
	siteName,
	pending,
	error,
	onStatus,
	onDelete,
	onClose,
}: Readonly<LeadDetailProps & { onClose: () => void }>) {
	const { confirmingDelete, deleteButtonRef, requestDelete, cancelDelete } =
		useLeadDeleteConfirmation(pending);
	const { closing, requestClose } = useModalExit(onClose);
	const who = leadName(lead);
	return (
		<Modal
			placement="sheet"
			detent="full"
			size="lg"
			title={who}
			closing={closing}
			onClose={() => {
				if (pending) return;
				if (confirmingDelete) cancelDelete();
				else requestClose();
			}}
		>
			<ModalBody>
				{!confirmingDelete ? (
					<LeadDetailContent
						lead={lead}
						pending={pending}
						error={error}
						onStatus={onStatus}
						onRequestDelete={requestDelete}
						deleteButtonRef={deleteButtonRef}
					/>
				) : (
					<ConfirmPanel
						headingLevel={3}
						title={`Delete enquiry from ${who}?`}
						pending={pending}
						error={error}
						onConfirm={() => void onDelete()}
						onCancel={cancelDelete}
						{...DELETE_CONFIRM}
					/>
				)}
			</ModalBody>
			{!confirmingDelete ? (
				<ModalFooter>
					<LeadReplyActions lead={lead} siteName={siteName} pending={pending} onStatus={onStatus} />
				</ModalFooter>
			) : null}
		</Modal>
	);
}

/**
 * Desktop split-pane detail (Tier 2a at 1280): the selected enquiry inline in
 * lg:col-span-7, crossfading at fast when the selection changes (the parent
 * keys this panel by lead id).
 */
export function LeadPane({
	lead,
	siteName,
	pending,
	error,
	onStatus,
	onDelete,
}: Readonly<LeadDetailProps>) {
	const { confirmingDelete, deleteButtonRef, requestDelete, cancelDelete } =
		useLeadDeleteConfirmation(pending);
	const who = leadName(lead);
	return (
		<section
			aria-label={`Enquiry from ${who}`}
			className={cn(adminPanel, "starting:opacity-0 transition-opacity duration-(--duration-fast)")}
		>
			{!confirmingDelete ? (
				<div className="space-y-group">
					<h2 className={cn(adminSectionTitle, "wrap-anywhere")}>{who}</h2>
					<LeadDetailContent
						lead={lead}
						pending={pending}
						error={error}
						onStatus={onStatus}
						onRequestDelete={requestDelete}
						deleteButtonRef={deleteButtonRef}
					/>
					<LeadReplyActions lead={lead} siteName={siteName} pending={pending} onStatus={onStatus} />
				</div>
			) : (
				<ConfirmPanel
					headingLevel={3}
					title={`Delete enquiry from ${who}?`}
					pending={pending}
					error={error}
					onConfirm={() => void onDelete()}
					onCancel={cancelDelete}
					{...DELETE_CONFIRM}
				/>
			)}
		</section>
	);
}
