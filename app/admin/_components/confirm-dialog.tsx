"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * App-style confirmation modal for destructive admin actions, exposed as a
 * promise-returning hook so call sites read like the old window.confirm:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete X?", confirmLabel: "Delete" })) { ... }
 *
 * Accessible: role="dialog" + aria-modal, focus moves to the cancel button on
 * open and is restored on close, ESC cancels, backdrop click cancels, Tab is
 * trapped inside the dialog.
 */
interface ConfirmOptions {
	title: string;
	body?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Style the confirm button as destructive (default true). */
	destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
	return ctx;
}

interface DialogState extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	const [state, setState] = useState<DialogState | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

	const confirm = useCallback<ConfirmFn>((opts) => {
		triggerRef.current = document.activeElement as HTMLElement | null;
		return new Promise<boolean>((resolve) => {
			setState({ ...opts, resolve });
		});
	}, []);

	const close = useCallback(
		(result: boolean) => {
			state?.resolve(result);
			setState(null);
			triggerRef.current?.focus?.();
		},
		[state],
	);

	// Focus management + key handling while open.
	useEffect(() => {
		if (!state) return;
		cancelRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				close(false);
			} else if (e.key === "Tab" && dialogRef.current) {
				const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
				if (focusable.length === 0) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		};
		document.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [state, close]);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{state ? (
				<div className="fixed inset-0 z-[100] grid place-items-center p-4">
					{/* Backdrop */}
					<button
						type="button"
						aria-label="Cancel"
						onClick={() => close(false)}
						className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
					/>
					{/* Dialog */}
					<div
						ref={dialogRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby="confirm-title"
						className="relative w-full max-w-sm rounded-(--radius-md) border border-line bg-bg p-5 shadow-2xl sm:p-6"
					>
						<div className="flex items-start gap-3">
							{state.destructive !== false ? (
								<span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ruby/10 text-ruby">
									<AlertTriangle size={18} />
								</span>
							) : null}
							<div className="min-w-0 flex-1">
								<h2 id="confirm-title" className="t-display text-lg">
									{state.title}
								</h2>
								{state.body ? <p className="mt-1.5 text-sm text-muted">{state.body}</p> : null}
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-2.5">
							<button
								ref={cancelRef}
								type="button"
								onClick={() => close(false)}
								className="inline-flex h-10 items-center rounded-(--radius-sm) border border-line bg-bg px-4 text-sm font-medium text-ink transition-colors hover:bg-bg-soft"
							>
								{state.cancelLabel ?? "Cancel"}
							</button>
							<button
								type="button"
								onClick={() => close(true)}
								className={
									state.destructive !== false
										? "inline-flex h-10 items-center rounded-(--radius-sm) bg-ruby px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
										: "inline-flex h-10 items-center rounded-(--radius-sm) bg-accent px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
								}
							>
								{state.confirmLabel ?? "Confirm"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</ConfirmContext.Provider>
	);
}
