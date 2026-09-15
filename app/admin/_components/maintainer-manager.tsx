"use client";

import { LoaderCircle, Shield, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { unwrap } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { inviteMaintainer, revokeMaintainer } from "../actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
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
	const router = useRouter();
	const { pending, pendingVisible, err, run } = useAdminAction();
	const [roster, setRoster] = useServerSyncedList(initial);
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [added, setAdded] = useState<string | null>(null);
	const [removed, setRemoved] = useState<string | null>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const removeButtons = useRef(new Map<string, HTMLButtonElement>());
	const ids = useId();
	const hasDraft = Boolean(email.trim() || name.trim());
	const myEmail = me.trim().toLowerCase();

	useAdminDraftGuard(hasDraft || pending);

	useEffect(() => {
		if (added && !pending) emailRef.current?.focus();
	}, [added, pending]);

	const onAdd = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (pending) return;
		const address = email.trim().toLowerCase();
		let error: string | null = null;
		if (!address) {
			error = "Enter a Google email.";
		} else if (emailRef.current?.validity.typeMismatch) {
			error = "Enter a valid Google email, such as name@example.com.";
		} else if (roster.some((m) => m.email.trim().toLowerCase() === address)) {
			error = `${address} already has access.`;
		}
		setFieldError(error);
		setAdded(null);
		if (error) {
			emailRef.current?.focus();
			return;
		}
		const displayName = name.trim() || null;
		run(
			() => inviteMaintainer(address, displayName ?? undefined),
			() => {
				setRoster((previous) =>
					previous.some((m) => m.email.trim().toLowerCase() === address)
						? previous
						: [...previous, { email: address, name: displayName, isRoot: false, addedBy: myEmail }],
				);
				setAdded(address);
				setRemoved(null);
				setEmail("");
				setName("");
			},
		);
	};

	const onRemove = async (m: MaintainerView, isMe: boolean) => {
		if (m.isRoot || pending) return;
		const index = roster.findIndex((item) => item.email === m.email);
		const nextMaintainer =
			roster.slice(index + 1).find((item) => !item.isRoot) ??
			roster
				.slice(0, index)
				.reverse()
				.find((item) => !item.isRoot);
		const ok = await confirm({
			...(isMe
				? {
						title: "Remove your own access?",
						body: "You will lose access to this admin as soon as you confirm, and another maintainer will need to add you back.",
						confirmLabel: "Remove my access",
						cancelLabel: "Keep my access",
					}
				: {
						title: `Remove ${m.name?.trim() || m.email}?`,
						body: `${m.email} will lose admin access.`,
						confirmLabel: "Remove maintainer",
						cancelLabel: "Keep maintainer",
					}),
			action: async () => {
				unwrap(await revokeMaintainer(m.email));
				return true;
			},
		});
		if (!ok) return;
		setRoster((previous) => previous.filter((item) => item.email !== m.email));
		setAdded(null);
		setRemoved(m.email);
		router.refresh();
		requestAnimationFrame(() => {
			const nextButton = nextMaintainer
				? removeButtons.current.get(nextMaintainer.email)
				: undefined;
			(nextButton ?? emailRef.current)?.focus();
		});
	};

	return (
		<div className="space-y-group">
			{/* Ruling 42: the add form and the roster are independent panels, side by side from lg (Tier 2g: invite 4, roster 8). */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
				<form
					aria-labelledby={`${ids}-title`}
					aria-busy={pending || undefined}
					className={cn(adminPanelInset, "min-w-0")}
					noValidate
					onSubmit={onAdd}
				>
					<AdminPanelHeader
						id={`${ids}-title`}
						as="h2"
						title="Add a maintainer"
						description="They can sign in straight away with this Google account. Nothing is emailed to them."
					/>
					<fieldset disabled={pending} className="grid min-w-0 gap-(--form-gap)">
						<div className="grid min-w-0 gap-(--field-label-gap)">
							<label htmlFor={`${ids}-email`} className={adminLabel}>
								Google email
								<input
									ref={emailRef}
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
							{fieldError ? (
								<p id={`${ids}-error`} role="alert" className={cn(adminError, "wrap-anywhere")}>
									{fieldError}
								</p>
							) : null}
						</div>
						<label htmlFor={`${ids}-name`} className={adminLabel}>
							Name (optional)
							<input
								id={`${ids}-name`}
								autoComplete="name"
								autoCapitalize="words"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									if (added) setAdded(null);
								}}
								className={adminField}
							/>
						</label>
						<button
							type="submit"
							disabled={pending}
							aria-busy={pending || undefined}
							className={cn(adminBtnPrimary, "w-full sm:w-auto sm:self-end sm:justify-self-end")}
						>
							{pendingVisible ? (
								<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
							) : (
								<UserPlus size={ICON_MD} aria-hidden="true" />
							)}
							Add maintainer
						</button>
					</fieldset>
					{err && !fieldError ? (
						<AdminNotice variant="error" className="mt-3 wrap-anywhere">
							{err}
						</AdminNotice>
					) : null}
					{added ? (
						<AdminNotice variant="success" className="mt-3 wrap-anywhere">
							{added} can now sign in with Google at kalchar.co.in/admin.
						</AdminNotice>
					) : null}
				</form>

				<section aria-labelledby={`${ids}-roster-title`} className="min-w-0">
					<AdminPanelHeader
						id={`${ids}-roster-title`}
						title="Current maintainers"
						description={`${roster.length} ${roster.length === 1 ? "person has" : "people have"} access. Root access cannot be removed.`}
					/>
					<ul
						aria-labelledby={`${ids}-roster-title`}
						className="min-w-0 divide-y divide-line overflow-hidden rounded-(--radius-md) border border-line bg-surface"
					>
						{roster.map((m) => {
							const isMe = m.email.trim().toLowerCase() === myEmail;
							const displayName = m.name?.trim();
							return (
								// Row anatomy 1.11: leading initials disc (the one people-shape),
								// min-w-0 body, trailing cluster with Remove behind the divider.
								<li
									key={m.email}
									className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
								>
									<span aria-hidden="true" className={cn(adminInitialsDisc, "size-control")}>
										{maintainerInitials(m)}
									</span>
									<div className="min-w-0">
										<p className="wrap-anywhere text-sm font-medium text-ink">
											{displayName || m.email}
											{isMe ? (
												<span className="ml-1.5 text-label font-normal text-accent-text">
													(you)
												</span>
											) : null}
										</p>
										{displayName ? (
											<p className="wrap-anywhere text-label text-muted">{m.email}</p>
										) : null}
										{m.addedBy ? (
											<p className="wrap-anywhere text-label text-muted">Added by {m.addedBy}</p>
										) : null}
									</div>
									{m.isRoot ? (
										<Badge
											variant="muted"
											className="col-start-2 h-6 shrink-0 justify-self-start sm:col-auto"
										>
											<Shield size={ICON_SM} aria-hidden="true" />
											Root
										</Badge>
									) : (
										<span className="col-start-2 flex sm:col-auto sm:ml-4 sm:border-l sm:border-line sm:pl-4">
											<button
												ref={(button) => {
													if (button) removeButtons.current.set(m.email, button);
													else removeButtons.current.delete(m.email);
												}}
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
					{removed ? (
						<AdminNotice variant="success" className="mt-3 wrap-anywhere">
							{removed} no longer has access.
						</AdminNotice>
					) : null}
				</section>
			</div>
		</div>
	);
}
