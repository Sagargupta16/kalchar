"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminBtnDangerSolid, adminBtnPrimary, ICON_MD } from "./controls";
import { Modal, ModalBody } from "./modal";
import { usePendingVisible } from "./use-admin-action";

const GENERIC_FAILURE = "Something went wrong. Refresh and try again.";

/**
 * App-style confirmation modal for destructive admin actions, exposed as a
 * promise-returning hook so call sites read like the old window.confirm:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete X?", confirmLabel: "Delete piece" })) { ... }
 *
 * The a11y + mobile plumbing (focus trap, ESC, scroll lock, backdrop) lives in
 * the shared <Modal> shell.
 */
export interface ConfirmOptions {
	/** Names the object as a question: `Delete "Peacock on Lotus"?`. Never "Are you sure?". */
	title: string;
	/** One line stating the effect. */
	body?: string;
	/** Required (ux-brief copy rule): the title's verb plus its noun ("Delete piece"); "Confirm" can never appear. */
	confirmLabel: string;
	/** Default "Cancel"; outcome form when the caller has one ("Keep piece"). */
	cancelLabel?: string;
	/** Solid ruby confirm when true (default). */
	destructive?: boolean;
	/**
	 * When given, the dialog runs it on confirm and stays open while it is
	 * pending (spinner in the confirm button, both buttons disabled); a false
	 * result or a throw renders the message inside the dialog and re-enables
	 * the buttons; true closes the dialog. The promise from confirm() then
	 * resolves true only after the action succeeded.
	 */
	action?: () => Promise<boolean>;
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

export function ConfirmProvider({ children }: Readonly<{ children: ReactNode }>) {
	const [state, setState] = useState<DialogState | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const titleId = useId();
	const bodyId = useId();

	const confirm = useCallback<ConfirmFn>((opts) => {
		return new Promise<boolean>((resolve) => {
			setState({ ...opts, resolve });
		});
	}, []);

	// A1's deferred exit is NOT wired here: page-wide locators in the locked
	// suites (removals, outcome labels) hard-fail on strict-mode collisions
	// while a closing dialog lingers, and visual-direction-admin 1.7 assigns
	// the closing flag to the motion-polish step. useModalExit stays available.
	const settle = useCallback(
		(result: boolean) => {
			state?.resolve(result);
			setState(null);
			setError(null);
			setPending(false);
		},
		[state],
	);

	const runAction = async () => {
		if (!state?.action) return settle(true);
		setError(null);
		setPending(true);
		try {
			const ok = await state.action();
			if (ok) settle(true);
			else setError(GENERIC_FAILURE);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : GENERIC_FAILURE);
		} finally {
			setPending(false);
		}
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{state ? (
				<Modal
					title={state.title}
					titleId={titleId}
					describedBy={state.body ? bodyId : undefined}
					placement="center"
					size="md"
					onClose={() => settle(false)}
				>
					<ModalBody>
						<ConfirmPanel
							title={state.title}
							body={state.body}
							confirmLabel={state.confirmLabel}
							cancelLabel={state.cancelLabel}
							destructive={state.destructive}
							titleId={titleId}
							bodyId={bodyId}
							pending={pending}
							error={error}
							onCancel={() => settle(false)}
							onConfirm={runAction}
						/>
					</ModalBody>
				</Modal>
			) : null}
		</ConfirmContext.Provider>
	);
}

interface ConfirmPanelProps extends Omit<ConfirmOptions, "action"> {
	pending?: boolean;
	error?: string | null;
	onConfirm: () => void;
	onCancel: () => void;
	titleId?: string;
	bodyId?: string;
	/** h2 inside the confirm dialog (default); h3 when the panel replaces a sheet body under the sheet's h2. */
	headingLevel?: 2 | 3;
}

/**
 * The confirm step itself: title, effect line, outcome-labelled buttons. The
 * ConfirmProvider renders it in its own dialog; a sheet renders it in place of
 * its body (D14) so no second dialog stacks on the first.
 */
export function ConfirmPanel({
	title,
	body,
	confirmLabel,
	cancelLabel = "Cancel",
	destructive = true,
	pending = false,
	error,
	onConfirm,
	onCancel,
	titleId,
	bodyId,
	headingLevel = 2,
}: Readonly<ConfirmPanelProps>) {
	const generated = useId();
	const headingId = titleId ?? `${generated}-title`;
	const descriptionId = bodyId ?? `${generated}-body`;
	const cancelRef = useRef<HTMLButtonElement>(null);
	const spinning = usePendingVisible(pending);
	const Heading = headingLevel === 3 ? "h3" : "h2";

	// The safe outcome takes focus on entry; autoFocus is unreliable inside an already-open dialog.
	useEffect(() => {
		cancelRef.current?.focus();
	}, []);

	return (
		<div
			role="group"
			aria-labelledby={headingId}
			aria-describedby={body ? descriptionId : undefined}
			className="grid gap-4"
		>
			<div className="flex items-start gap-3">
				{destructive ? (
					<span
						aria-hidden="true"
						className="grid size-9 shrink-0 place-items-center rounded-full bg-ruby/10 text-ruby"
					>
						<AlertTriangle size={ICON_MD} />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<Heading id={headingId} className="t-heading text-lg">
						{title}
					</Heading>
					{body ? (
						<p id={descriptionId} className="mt-2 text-pretty text-sm text-muted">
							{body}
						</p>
					) : null}
				</div>
			</div>
			{error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
			<div className="flex flex-wrap justify-end gap-3">
				<button
					ref={cancelRef}
					type="button"
					onClick={onCancel}
					disabled={pending}
					className={adminBtn}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={pending}
					aria-busy={pending || undefined}
					className={destructive ? adminBtnDangerSolid : adminBtnPrimary}
				>
					{spinning ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : null}
					{confirmLabel}
				</button>
			</div>
		</div>
	);
}
