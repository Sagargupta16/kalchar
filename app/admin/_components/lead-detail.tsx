"use client";

import { useEffect, useRef, useState } from "react";
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
	adminPanel,
	adminSectionTitle,
} from "./controls";
import { Modal, ModalBody, ModalFooter } from "./modal";
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

/** The enquiry body shared by the phone sheet and the desktop pane. */
function LeadDetailContent({
	lead,
	pending,
	error,
	onStatus,
	onRequestDelete,
}: Readonly<
	Omit<LeadDetailProps, "siteName" | "onDelete"> & {
		onRequestDelete: () => void;
	}
>) {
	const who = leadName(lead);
	const chips = [lead.style, lead.size, lead.budget, lead.timeline].filter(
		(value): value is string => Boolean(value),
	);
	return (
		<div className="space-y-group">
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
					{chips.map((chip) => (
						<Badge key={chip} variant="muted" className="h-6">
							{chip}
						</Badge>
					))}
				</div>
			) : null}
			<p className="max-w-(--prose-max) whitespace-pre-wrap text-sm leading-relaxed text-ink">
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
			<div className="border-t border-line pt-group">
				<button
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

/**
 * navigator.clipboard needs a secure context and the clipboard-write
 * permission; older Safari and the component harness (about:blank) have
 * neither, so a selected off-screen textarea + execCommand is the fallback.
 * It mounts next to the button: inside an open <dialog>, body content is
 * inert and unselectable.
 */
async function writeClipboard(text: string, host: HTMLElement): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const area = document.createElement("textarea");
		area.value = text;
		area.setAttribute("readonly", "");
		area.style.position = "absolute";
		area.style.opacity = "0";
		host.appendChild(area);
		area.select();
		let copied = false;
		try {
			copied = document.execCommand("copy");
		} finally {
			area.remove();
		}
		return copied;
	}
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
	onStatus,
}: Readonly<Pick<LeadDetailProps, "lead" | "siteName" | "onStatus">>) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<number | null>(null);
	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	const whatsapp = leadReplyLinks(lead, siteName).find((link) => link.kind === "whatsapp");
	const { email } = parseLeadContact(lead.contact);
	if (!whatsapp && !email) return null;

	const copyEmail = async (host: HTMLElement) => {
		if (!email || !(await writeClipboard(email, host))) return;
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
					onClick={() => {
						if (lead.status === "new") void onStatus("contacted");
					}}
					className={cn(adminBtnPrimary, "flex-1")}
				>
					Reply on WhatsApp
				</a>
			) : null}
			{email ? (
				<button
					type="button"
					onClick={(event) => void copyEmail(event.currentTarget.parentElement ?? document.body)}
					className={cn(adminBtn, !whatsapp && "flex-1")}
				>
					{copied ? "Email copied" : "Copy email"}
				</button>
			) : null}
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
	const [step, setStep] = useState<"view" | "confirmDelete">("view");
	const who = leadName(lead);
	return (
		<Modal
			placement="sheet"
			detent="full"
			size="lg"
			title={who}
			onClose={step === "confirmDelete" ? () => setStep("view") : onClose}
		>
			<ModalBody>
				{step === "view" ? (
					<LeadDetailContent
						lead={lead}
						pending={pending}
						error={error}
						onStatus={onStatus}
						onRequestDelete={() => setStep("confirmDelete")}
					/>
				) : (
					<ConfirmPanel
						headingLevel={3}
						title={`Delete enquiry from ${who}?`}
						pending={pending}
						error={error}
						onConfirm={() => void onDelete()}
						onCancel={() => setStep("view")}
						{...DELETE_CONFIRM}
					/>
				)}
			</ModalBody>
			{step === "view" ? (
				<ModalFooter>
					<LeadReplyActions lead={lead} siteName={siteName} onStatus={onStatus} />
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
	const [step, setStep] = useState<"view" | "confirmDelete">("view");
	const who = leadName(lead);
	return (
		<section
			aria-label={`Enquiry from ${who}`}
			className={cn(
				adminPanel,
				"starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-fast)",
			)}
		>
			{step === "view" ? (
				<div className="space-y-group">
					<h2 className={adminSectionTitle}>{who}</h2>
					<LeadDetailContent
						lead={lead}
						pending={pending}
						error={error}
						onStatus={onStatus}
						onRequestDelete={() => setStep("confirmDelete")}
					/>
					<LeadReplyActions lead={lead} siteName={siteName} onStatus={onStatus} />
				</div>
			) : (
				<ConfirmPanel
					headingLevel={3}
					title={`Delete enquiry from ${who}?`}
					pending={pending}
					error={error}
					onConfirm={() => void onDelete()}
					onCancel={() => setStep("view")}
					{...DELETE_CONFIRM}
				/>
			)}
		</section>
	);
}
