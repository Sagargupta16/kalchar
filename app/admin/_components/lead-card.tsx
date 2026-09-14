"use client";

import { Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	formatLeadTimestamp,
	LEAD_STATUS_LABEL,
	LEAD_STATUSES,
	type LeadReplyKind,
	leadReplyLinks,
} from "@/lib/lead-triage";
import type { Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import {
	adminBtn,
	adminBtnPrimary,
	adminField,
	adminIconBtnDestructive,
	adminRow,
	ICON_MD,
} from "./controls";

const STATUS_BADGE: Record<LeadStatus, "accent" | "default" | "muted"> = {
	new: "accent",
	contacted: "default",
	closed: "muted",
};

const REPLY_ICON: Record<LeadReplyKind, typeof Phone> = {
	whatsapp: MessageCircle,
	call: Phone,
	email: Mail,
};

/**
 * One enquiry card: who and when, the brief, the chosen options, one-tap reply
 * links built from the free-text contact, the status select and Delete behind
 * a divider (D15). Failures render inside the card they belong to.
 */
export function LeadCard({
	lead,
	siteName,
	pending,
	error,
	onStatus,
	onDelete,
}: Readonly<{
	lead: Lead;
	siteName: string;
	pending: boolean;
	error: string | null;
	onStatus: (status: LeadStatus) => void;
	onDelete: () => void;
}>) {
	const links = leadReplyLinks(lead, siteName);
	const who = lead.name || "Someone";
	return (
		<li className={cn(adminRow, "p-4")}>
			<div className="flex flex-wrap items-start gap-3">
				<div className="min-w-0 flex-1 space-y-1">
					<p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
						<span className="truncate">{who}</span>
						{lead.style ? <span className="font-normal text-muted">{lead.style}</span> : null}
						<Badge variant={STATUS_BADGE[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
					</p>
					<p className="text-label text-muted tabular-nums">
						{formatLeadTimestamp(lead.createdAt)}
					</p>
					{lead.contact ? (
						<p className="break-words text-label text-muted">Contact: {lead.contact}</p>
					) : null}
				</div>
				<div className="ml-auto flex shrink-0 items-center">
					<label className="sr-only" htmlFor={`status-${lead.id}`}>
						Lead status
					</label>
					<select
						id={`status-${lead.id}`}
						value={lead.status}
						disabled={pending}
						onChange={(e) => onStatus(e.currentTarget.value as LeadStatus)}
						className={cn(adminField, "w-auto")}
					>
						{LEAD_STATUSES.map((s) => (
							<option key={s} value={s}>
								{LEAD_STATUS_LABEL[s]}
							</option>
						))}
					</select>
					<span className="ml-4 flex border-l border-line pl-4">
						<button
							type="button"
							disabled={pending}
							onClick={onDelete}
							aria-label={`Delete enquiry from ${who}`}
							className={adminIconBtnDestructive}
						>
							<Trash2 size={ICON_MD} aria-hidden="true" />
						</button>
					</span>
				</div>
			</div>
			<p className="mt-3 whitespace-pre-wrap text-sm text-ink">{lead.brief}</p>
			{lead.size || lead.budget || lead.timeline ? (
				<dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-label text-muted">
					{lead.size ? (
						<div>
							<dt className="inline font-medium">Size: </dt>
							<dd className="inline">{lead.size}</dd>
						</div>
					) : null}
					{lead.budget ? (
						<div>
							<dt className="inline font-medium">Budget: </dt>
							<dd className="inline">{lead.budget}</dd>
						</div>
					) : null}
					{lead.timeline ? (
						<div>
							<dt className="inline font-medium">Timeline: </dt>
							<dd className="inline">{lead.timeline}</dd>
						</div>
					) : null}
				</dl>
			) : null}
			{links.length > 0 ? (
				<div className="mt-4 flex flex-wrap gap-2">
					{links.map((link) => {
						const Icon = REPLY_ICON[link.kind];
						return (
							<a
								key={link.kind}
								href={link.href}
								target={link.external ? "_blank" : undefined}
								rel={link.external ? "noopener noreferrer" : undefined}
								onClick={() => {
									// Opening the chat is the reply: mark the enquiry Contacted once.
									if (link.kind === "whatsapp" && lead.status === "new") onStatus("contacted");
								}}
								className={link.kind === "whatsapp" ? adminBtnPrimary : adminBtn}
							>
								<Icon size={ICON_MD} aria-hidden="true" />
								{link.label}
							</a>
						);
					})}
				</div>
			) : null}
			{error ? (
				<AdminNotice variant="error" className="mt-3">
					{error}
				</AdminNotice>
			) : null}
		</li>
	);
}
