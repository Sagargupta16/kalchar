"use client";

import { Shield, Trash2, UserPlus } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { inviteMaintainer, revokeMaintainer } from "../actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import {
	adminBtnDestructive,
	adminBtnPrimary,
	adminError,
	adminField,
	adminInitialsDisc,
	adminLabel,
	adminPanelInset,
	ICON_MD,
	ICON_SM,
} from "./controls";
import { useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

interface MaintainerView {
	email: string;
	name: string | null;
	isRoot: boolean;
	addedBy: string | null;
}

/** Up to two initials from the name, else one from the email's local part ("Megha Seth" -> "MS", "root@..." -> "R"). */
function maintainerInitials(m: MaintainerView): string {
	const source = m.name?.trim() || m.email.split("@")[0] || m.email;
	const letters = source
		.split(/[\s._-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0] ?? "");
	return (letters.join("") || m.email.slice(0, 1)).toUpperCase();
}

export function MaintainerManager({
	roster: initial,
	me,
}: Readonly<{ roster: MaintainerView[]; me: string }>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [roster, setRoster] = useServerSyncedList(initial);
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [added, setAdded] = useState<string | null>(null);
	const ids = useId();

	const onRemove = async (m: MaintainerView, isMe: boolean) => {
		const ok = await confirm(
			isMe
				? {
						title: "Remove your own access?",
						body: "You will lose access to this admin as soon as you confirm, and another maintainer will need to add you back.",
						confirmLabel: "Remove my access",
						cancelLabel: "Keep my access",
					}
				: {
						title: `Remove ${m.name ?? m.email}?`,
						body: `${m.email} will lose admin access.`,
						confirmLabel: "Remove maintainer",
						cancelLabel: "Keep maintainer",
					},
		);
		if (!ok) return;
		run(
			() => revokeMaintainer(m.email),
			() => setRoster((prev) => prev.filter((x) => x.email !== m.email)),
		);
	};

	return (
		<div className="space-y-group">
			{/* Ruling 42: the add form and the roster are independent panels, side by side from lg (Tier 2g: invite 4, roster 8). */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
				<form
					aria-labelledby={`${ids}-title`}
					className={cn(adminPanelInset, "min-w-0")}
					onSubmit={(e) => {
						e.preventDefault();
						const address = email.trim().toLowerCase();
						if (!address) {
							setFieldError("Enter a Google email");
							return;
						}
						if (roster.some((m) => m.email.toLowerCase() === address)) {
							setFieldError(`${address} already has access.`);
							return;
						}
						setFieldError(null);
						setAdded(null);
						run(
							() => inviteMaintainer(address, name.trim() || undefined),
							() => {
								setAdded(address);
								setEmail("");
								setName("");
							},
						);
					}}
				>
					<AdminPanelHeader
						id={`${ids}-title`}
						as="h2"
						title="Add a maintainer"
						description="They can sign in straight away with this Google account. Nothing is emailed to them."
					/>
					<div className="grid gap-(--form-gap) sm:grid-cols-2">
						<label htmlFor={`${ids}-email`} className={cn(adminLabel, "sm:col-span-2")}>
							Google email
							<input
								id={`${ids}-email`}
								type="email"
								inputMode="email"
								autoComplete="email"
								autoCapitalize="none"
								spellCheck={false}
								required
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (fieldError) setFieldError(null);
									if (added) setAdded(null);
								}}
								aria-invalid={fieldError ? true : undefined}
								aria-describedby={fieldError ? `${ids}-error` : undefined}
								className={adminField}
							/>
						</label>
						<label htmlFor={`${ids}-name`} className={adminLabel}>
							Name (optional)
							<input
								id={`${ids}-name`}
								autoComplete="name"
								autoCapitalize="words"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={adminField}
							/>
						</label>
						<button
							type="submit"
							disabled={pending}
							className={cn(adminBtnPrimary, "w-full sm:w-auto sm:self-end sm:justify-self-end")}
						>
							<UserPlus size={ICON_MD} aria-hidden="true" />
							Add maintainer
						</button>
					</div>
					{fieldError ? (
						<p id={`${ids}-error`} className={cn(adminError, "mt-1")}>
							{fieldError}
						</p>
					) : null}
					{err ? (
						<AdminNotice variant="error" className="mt-3">
							{err}
						</AdminNotice>
					) : null}
					{added ? (
						<AdminNotice variant="success" className="mt-3">
							{added} can now sign in with Google at kalchar.co.in/admin.
						</AdminNotice>
					) : null}
				</form>

				<ul className="min-w-0 divide-y divide-line overflow-hidden rounded-(--radius-md) border border-line bg-surface">
					{roster.map((m) => {
						const isMe = m.email === me;
						const secondLine = [m.name ? m.email : null, m.addedBy ? `Added by ${m.addedBy}` : null]
							.filter(Boolean)
							.join(", ");
						return (
							// Row anatomy 1.11: leading initials disc (the one people-shape),
							// min-w-0 body, trailing cluster with Remove behind the divider.
							<li
								key={m.email}
								className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
							>
								<span aria-hidden="true" className={cn(adminInitialsDisc, "size-11")}>
									{maintainerInitials(m)}
								</span>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium text-ink">
										{m.name ?? m.email}
										{isMe ? (
											<span className="ml-1.5 text-label font-normal text-accent-text">(you)</span>
										) : null}
									</p>
									{secondLine ? (
										<p className="truncate text-label text-muted">{secondLine}</p>
									) : null}
								</div>
								{m.isRoot ? (
									<Badge variant="muted" className="h-6 shrink-0">
										<Shield size={ICON_SM} aria-hidden="true" />
										Root
									</Badge>
								) : (
									<span className="ml-4 flex border-l border-line pl-4">
										<button
											type="button"
											disabled={pending}
											onClick={() => onRemove(m, isMe)}
											aria-label={`Remove ${m.email}`}
											className={cn(adminBtnDestructive, "shrink-0")}
										>
											<Trash2 size={ICON_MD} aria-hidden="true" />
											Remove
										</button>
									</span>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
