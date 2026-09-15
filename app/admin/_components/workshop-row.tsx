"use client";

import { Check, ChevronDown, LoaderCircle, Presentation, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { isFailure } from "@/lib/action-result";
import type { Workshop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteWorkshop, updateWorkshop } from "../actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import {
	adminBtn,
	adminBtnPrimary,
	adminField,
	adminHelp,
	adminIconBtnDestructive,
	adminLabel,
	adminRow,
	ICON_MD,
} from "./controls";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

export interface WorkshopDraft {
	title: string;
	blurb: string;
	durationHours: string;
}

export interface WorkshopDraftError {
	field: keyof WorkshopDraft;
	message: string;
}

export function parseWorkshopDraft(
	draft: WorkshopDraft,
):
	| { error: WorkshopDraftError }
	| { fields: { title: string; blurb: string; durationHours: number | null } } {
	const title = draft.title.trim();
	const blurb = draft.blurb.trim();
	if (!title) return { error: { field: "title", message: "Enter a title." } };
	if (!blurb) return { error: { field: "blurb", message: "Enter a description." } };
	const durationHours = draft.durationHours.trim() ? Number(draft.durationHours) : null;
	if (
		durationHours !== null &&
		(!Number.isFinite(Math.fround(durationHours)) || Math.fround(durationHours) <= 0)
	) {
		return {
			error: { field: "durationHours", message: "Duration must be a positive number." },
		};
	}
	return { fields: { title, blurb, durationHours } };
}

export function focusWorkshopField(form: HTMLFormElement | null, field: keyof WorkshopDraft) {
	const control = form?.elements.namedItem(field);
	if (control instanceof HTMLElement) control.focus();
}

export function useWorkshopDraftGuard({ dirty, pending }: { dirty: boolean; pending: boolean }) {
	const confirm = useConfirm();
	useAdminDraftGuard(dirty || pending);

	return async () => {
		if (pending) return false;
		if (!dirty) return true;
		return confirm({
			title: "Discard changes?",
			body: "Your unsaved workshop changes will be lost.",
			confirmLabel: "Discard changes",
			cancelLabel: "Keep editing",
		});
	};
}

/** "1 hour" / "2.5 hours": matches the public copy; "3 H" reads as a unit code (flow 12). */
function formatHours(n: number): string {
	return `${n} hour${n === 1 ? "" : "s"}`;
}

/**
 * The duration disc leading every workshop row (visual-direction-admin Tier
 * 2c): the public workshops surface makes duration the biggest fact, so the
 * admin mirrors it. Decorative (aria-hidden); the meta line carries the
 * duration in words. Without a duration the disc keeps the column with the
 * workshop glyph so every row's title starts at the same x (alignment rule 1).
 */
function DurationDisc({ hours }: Readonly<{ hours?: number }>) {
	if (!hours) {
		return (
			<span
				aria-hidden="true"
				data-duration-disc=""
				className="grid size-12 shrink-0 place-items-center rounded-full bg-canvas text-muted shadow-hairline"
			>
				<Presentation size={ICON_MD} aria-hidden="true" />
			</span>
		);
	}
	return (
		<span
			aria-hidden="true"
			data-duration-disc=""
			className="grid size-12 shrink-0 place-items-center rounded-full bg-pichwai/12 text-sm font-semibold text-pichwai tabular-nums dark:bg-pichwai/24"
		>
			{hours}h
		</span>
	);
}

export interface WorkshopRowProps {
	workshop: Workshop;
	/** The manager's reorder-save flag: drag stays frozen during a list save. */
	listPending: boolean;
	/** The shared ReorderHandle, rendered by the manager so it owns move()/count. */
	reorderHandle: ReactNode;
	dragProps: React.LiHTMLAttributes<HTMLLIElement>;
	dragging: boolean;
	over: boolean;
	highlighted: boolean;
	onChanged: (next: Workshop) => void;
	onDeleted: (slug: string) => void;
	onPendingChange: (slug: string, pending: boolean) => void;
}

/**
 * The R6 row (D15) for one workshop: a pichwai duration disc, the Edit body
 * (title + duration-and-blurb meta line), then the Move column, a hairline and
 * Delete in the trailing cluster with at least 16px clear space. Two lines on
 * phones, one from a 576px container (@xl/row). The body expands an inline
 * editor in the shared form rhythm.
 */
export function WorkshopRow({
	workshop,
	listPending,
	reorderHandle,
	dragProps,
	dragging,
	over,
	highlighted,
	onChanged,
	onDeleted,
	onPendingChange,
}: Readonly<WorkshopRowProps>) {
	const confirm = useConfirm();
	const editorId = useId();
	const errorId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const editRef = useRef<HTMLButtonElement>(null);
	const { pending: rowPending, pendingVisible, err, run } = useAdminAction();
	const [editing, setEditing] = useState(false);
	const [saved, setSaved] = useState(false);
	const [localErr, setLocalErr] = useState<WorkshopDraftError | null>(null);
	const [showActionError, setShowActionError] = useState(false);
	const [title, setTitle] = useState(workshop.title);
	const [blurb, setBlurb] = useState(workshop.blurb);
	const [duration, setDuration] = useState(workshop.durationHours?.toString() ?? "");
	const [draftBase, setDraftBase] = useState(workshop);
	const pending = rowPending || listPending;
	const dirty =
		editing &&
		(title !== draftBase.title ||
			blurb !== draftBase.blurb ||
			duration !== (draftBase.durationHours?.toString() ?? ""));

	if (
		workshop.title !== draftBase.title ||
		workshop.blurb !== draftBase.blurb ||
		workshop.durationHours !== draftBase.durationHours
	) {
		setDraftBase(workshop);
		if (!dirty) {
			setTitle(workshop.title);
			setBlurb(workshop.blurb);
			setDuration(workshop.durationHours?.toString() ?? "");
		}
	}

	const canDiscard = useWorkshopDraftGuard({
		dirty,
		pending,
	});

	useEffect(() => {
		onPendingChange(workshop.slug, rowPending);
		return () => onPendingChange(workshop.slug, false);
	}, [onPendingChange, rowPending, workshop.slug]);

	useEffect(() => {
		if (editing) focusWorkshopField(formRef.current, "title");
	}, [editing]);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	const startEditing = () => {
		setTitle(workshop.title);
		setBlurb(workshop.blurb);
		setDuration(workshop.durationHours?.toString() ?? "");
		setLocalErr(null);
		setShowActionError(false);
		setSaved(false);
		setEditing(true);
	};

	const cancelEdit = async () => {
		if (!(await canDiscard())) return;
		setLocalErr(null);
		setShowActionError(false);
		setSaved(false);
		setEditing(false);
		requestAnimationFrame(() => editRef.current?.focus());
	};

	const save = () => {
		if (pending) return;
		setLocalErr(null);
		setSaved(false);
		setShowActionError(false);
		const result = parseWorkshopDraft({ title, blurb, durationHours: duration });
		if ("error" in result) {
			setLocalErr(result.error);
			focusWorkshopField(formRef.current, result.error.field);
			return;
		}
		const { fields } = result;
		setShowActionError(true);
		run(
			() => updateWorkshop(workshop.slug, fields),
			() => {
				setTitle(fields.title);
				setBlurb(fields.blurb);
				setDuration(fields.durationHours?.toString() ?? "");
				setSaved(true);
				onChanged({
					...workshop,
					...fields,
					durationHours: fields.durationHours ?? undefined,
				});
			},
		);
	};

	const remove = async () => {
		if (pending) return;
		setShowActionError(false);
		const ok = await confirm({
			title: `Delete "${workshop.title}"?`,
			body: "The workshop leaves the public workshops page.",
			confirmLabel: "Delete workshop",
			cancelLabel: "Keep workshop",
			action: async () => {
				let failure: unknown;
				const deleted = await run(async () => {
					try {
						const result = await deleteWorkshop(workshop.slug);
						if (isFailure(result)) throw new Error(result.message);
						return result;
					} catch (error) {
						failure = error;
						throw error;
					}
				});
				if (failure) throw failure;
				return deleted;
			},
		});
		if (ok) onDeleted(workshop.slug);
	};

	const rowError = localErr?.message ?? (showActionError ? err : null);

	return (
		<li
			id={`workshop-${workshop.slug}`}
			{...dragProps}
			draggable={!editing && !pending && dragProps.draggable}
			onDragStart={(event) => {
				if (!editing && !pending) dragProps.onDragStart?.(event);
			}}
			className={cn(
				adminRow,
				"@container/row scroll-mt-(--header-h-shrunk)",
				dragging && "scale-[0.98] opacity-60 shadow-e3 select-none",
				over && !dragging && "border-accent shadow-e1",
				highlighted && "border-accent",
			)}
		>
			<div className="flex flex-col gap-4 @xl/row:flex-row @xl/row:items-center @xl/row:gap-3">
				{/* Line 1: the Edit body, led by the duration disc */}
				<button
					ref={editRef}
					type="button"
					aria-expanded={editing}
					aria-controls={editorId}
					aria-label={`Edit ${workshop.title}`}
					disabled={pending}
					onClick={() => (editing ? cancelEdit() : startEditing())}
					className="flex min-h-control min-w-0 flex-1 items-center gap-3 rounded-(--radius-sm) text-left transition-ui pressable hover:text-accent-text disabled:pointer-events-none disabled:opacity-50"
				>
					<DurationDisc hours={workshop.durationHours} />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium text-ink">{workshop.title}</span>
						<span className={cn(adminHelp, "mt-1 block truncate")}>
							{workshop.durationHours ? `${formatHours(workshop.durationHours)}, ` : ""}
							{workshop.blurb}
						</span>
					</span>
					<span
						aria-hidden="true"
						className="grid size-control shrink-0 place-items-center text-muted"
					>
						<ChevronDown size={ICON_MD} className={cn("transition-ui", editing && "rotate-180")} />
					</span>
				</button>
				{/* Line 2 (phone) / trailing cluster: Move column, divider, Delete */}
				<div className="flex items-center gap-2 @xl/row:shrink-0">
					{reorderHandle}
					<div className="ml-auto flex items-center border-l border-line pl-4 @xl/row:ml-4">
						<button
							type="button"
							disabled={pending}
							onClick={remove}
							aria-label={`Delete ${workshop.title}`}
							className={adminIconBtnDestructive}
						>
							<Trash2 size={ICON_MD} aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>

			{editing ? (
				<form
					ref={formRef}
					id={editorId}
					noValidate
					aria-label={`Edit ${workshop.title}`}
					className="mt-3 border-t border-line pt-3"
					onChange={() => {
						setLocalErr(null);
						setShowActionError(false);
						setSaved(false);
					}}
					onSubmit={(e) => {
						e.preventDefault();
						save();
					}}
				>
					<div className="grid gap-(--form-gap) sm:grid-cols-2">
						<div className={cn(adminLabel, "sm:col-span-2")}>
							<label htmlFor={`workshop-title-${workshop.slug}`}>Title *</label>
							<input
								id={`workshop-title-${workshop.slug}`}
								name="title"
								required
								aria-invalid={localErr?.field === "title" || undefined}
								aria-describedby={localErr?.field === "title" ? errorId : undefined}
								autoCorrect="off"
								disabled={pending}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className={adminField}
							/>
						</div>
						<div className={cn(adminLabel, "sm:col-span-2")}>
							<label htmlFor={`workshop-blurb-${workshop.slug}`}>Description *</label>
							<textarea
								id={`workshop-blurb-${workshop.slug}`}
								name="blurb"
								required
								aria-invalid={localErr?.field === "blurb" || undefined}
								aria-describedby={localErr?.field === "blurb" ? errorId : undefined}
								rows={3}
								disabled={pending}
								value={blurb}
								onChange={(e) => setBlurb(e.target.value)}
								className={adminField}
							/>
						</div>
						<div className={adminLabel}>
							<label htmlFor={`workshop-duration-${workshop.slug}`}>
								Duration (hours) (optional)
							</label>
							<input
								id={`workshop-duration-${workshop.slug}`}
								name="durationHours"
								type="text"
								inputMode="decimal"
								aria-invalid={localErr?.field === "durationHours" || undefined}
								aria-describedby={localErr?.field === "durationHours" ? errorId : undefined}
								placeholder="e.g. 2"
								disabled={pending}
								value={duration}
								onChange={(e) => setDuration(e.target.value)}
								className={adminField}
							/>
						</div>
					</div>
					<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button type="button" disabled={pending} onClick={cancelEdit} className={adminBtn}>
							Cancel
						</button>
						<button
							type="submit"
							disabled={pending}
							aria-busy={pending}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							{pendingVisible ? (
								<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
							) : (
								<Check size={ICON_MD} aria-hidden="true" />
							)}
							Save
						</button>
						{saved ? <AdminNotice variant="success">Saved</AdminNotice> : null}
					</div>
				</form>
			) : null}

			{rowError ? (
				<AdminNotice id={errorId} variant="error" className="mt-3">
					{rowError}
				</AdminNotice>
			) : null}
		</li>
	);
}
