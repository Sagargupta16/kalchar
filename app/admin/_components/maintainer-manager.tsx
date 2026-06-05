"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inviteMaintainer, revokeMaintainer } from "../actions";
import { adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";

interface MaintainerView {
	email: string;
	name: string | null;
	isRoot: boolean;
	addedBy: string | null;
}

export function MaintainerManager({
	roster,
	me,
}: Readonly<{ roster: MaintainerView[]; me: string }>) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [err, setErr] = useState<string | null>(null);

	function run(fn: () => Promise<void>, after?: () => void) {
		setErr(null);
		startTransition(async () => {
			try {
				await fn();
				after?.();
				router.refresh();
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Failed.");
			}
		});
	}

	const field = adminField;

	return (
		<div className="space-y-6">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!email.trim()) return;
					run(
						() => inviteMaintainer(email.trim(), name.trim() || undefined),
						() => {
							setEmail("");
							setName("");
						},
					);
				}}
				className="flex flex-wrap items-end gap-3 rounded-md border border-line p-4"
			>
				<label className="flex flex-col gap-1 text-xs text-muted">
					<span>Google email *</span>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="person@gmail.com"
						required
						className={`${field} w-64`}
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs text-muted">
					<span>Name (optional)</span>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={`${field} w-40`}
					/>
				</label>
				<button type="submit" disabled={pending} className={adminBtnPrimary}>
					Add maintainer
				</button>
			</form>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			<ul className="divide-y divide-line rounded-md border border-line">
				{roster.map((m) => {
					let role = "Maintainer";
					if (m.isRoot) role = "Root maintainer";
					else if (m.addedBy) role = `Added by ${m.addedBy}`;
					return (
						<li key={m.email} className="flex items-center justify-between gap-3 px-4 py-3">
							<div>
								<p className="text-sm font-medium">
									{m.name ? `${m.name} · ` : ""}
									{m.email}
									{m.email === me ? " (you)" : ""}
								</p>
								<p className="text-xs text-muted">{role}</p>
							</div>
							{m.isRoot ? (
								<span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
									root
								</span>
							) : (
								<button
									type="button"
									disabled={pending}
									onClick={() => {
										if (confirm(`Remove ${m.email} as a maintainer?`)) {
											run(() => revokeMaintainer(m.email));
										}
									}}
									className={`${adminBtnDestructive} px-3 py-1`}
								>
									Remove
								</button>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
