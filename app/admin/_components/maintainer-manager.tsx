"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inviteMaintainer, revokeMaintainer } from "../actions";

interface MaintainerView {
	email: string;
	name: string | null;
	isRoot: boolean;
	addedBy: string | null;
}

export function MaintainerManager({ roster, me }: { roster: MaintainerView[]; me: string }) {
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

	const field =
		"rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none";

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
					Google email *
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
					Name (optional)
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={`${field} w-40`}
					/>
				</label>
				<button
					type="submit"
					disabled={pending}
					className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
				>
					Add maintainer
				</button>
			</form>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			<ul className="divide-y divide-line rounded-md border border-line">
				{roster.map((m) => (
					<li key={m.email} className="flex items-center justify-between gap-3 px-4 py-3">
						<div>
							<p className="text-sm font-medium">
								{m.name ? `${m.name} · ` : ""}
								{m.email}
								{m.email === me ? " (you)" : ""}
							</p>
							<p className="text-xs text-muted">
								{m.isRoot ? "Root maintainer" : m.addedBy ? `Added by ${m.addedBy}` : "Maintainer"}
							</p>
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
								className="rounded-md border border-ruby/40 px-3 py-1 text-sm text-ruby transition-colors hover:bg-ruby hover:text-bg"
							>
								Remove
							</button>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
