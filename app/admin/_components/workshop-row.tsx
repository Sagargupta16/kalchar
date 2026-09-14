"use client";

import { Check, ChevronDown, LoaderCircle, Presentation, Trash2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import type { Workshop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteWorkshop, updateWorkshop } from "../actions";
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
}: Readonly<WorkshopRowProps>) {
	const confirm = useConfirm();
	const editorId = useId();
	const { pending: rowPending, pendingVisible, err, run } = useAdminAction();
	const [editing, setEditing] = useState(false);
	const [saved, setSaved] = useState(false);
	const [localErr, setLocalErr] = useState<string | null>(null);
	const [title, setTitle] = useState(workshop.title);
	const [blurb, setBlurb] = useState(workshop.blurb);
	const [duration, setDuration] = useState(workshop.durationHours?.toString() ?? "");
	const pending = rowPending || listPending;

	const startEditing = () => {
		setTitle(workshop.title);
		setBlurb(workshop.blurb);
		setDuration(workshop.durationHours?.toString() ?? "");
		setLocalErr(null);
		setEditing(true);
	};

	const cancelEdit = () => {
		setLocalErr(null);
		setEditing(false);
	};

	// Blank and duration checks run locally so a bad draft never round-trips to
	// the DB constraint's generic message (flows 19 / 31 / 32).
	const save = () => {
		setLocalErr(null);
		const trimmedTitle = title.trim();
		const trimmedBlurb = blurb.trim();
		if (!trimmedTitle) {
			setLocalErr("Enter a title.");
			return;
		}
		if (!trimmedBlurb) {
			setLocalErr("Enter a description.");
			return;
		}
		let durationHours: number | null = null;
		if (duration.trim()) {
			const parsed = Number(duration);
			if (Number.isNaN(parsed) || parsed <= 0) {
				setLocalErr("Duration must be a positive number.");
				return;
			}
			durationHours = parsed;
		}
		run(
			() =>
				updateWorkshop(workshop.slug, { title: trimmedTitle, blurb: trimmedBlurb, durationHours }),
			() => {
				setSaved(true);
				window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
				onChanged({
					...workshop,
					title: trimmedTitle,
					blurb: trimmedBlurb,
					durationHours: durationHours ?? undefined,
				});
			},
		);
	};

	const remove = async () => {
		const ok = await confirm({
			title: `Delete "${workshop.title}"?`,
			body: "The workshop leaves the public workshops page.",
			confirmLabel: "Delete workshop",
			cancelLabel: "Keep workshop",
		});
		if (ok)
			run(
				() => deleteWorkshop(workshop.slug),
				() => onDeleted(workshop.slug),
			);
	};

	const rowError = localErr ?? err;

	return (
		<li
			id={`workshop-${workshop.slug}`}
			{...dragProps}
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
				<div id={editorId} className="mt-3 border-t border-line pt-3">
					<div className="grid gap-(--form-gap) sm:grid-cols-2">
						<div className={cn(adminLabel, "sm:col-span-2")}>
							<label htmlFor={`workshop-title-${workshop.slug}`}>Title *</label>
							<input
								id={`workshop-title-${workshop.slug}`}
								required
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
								required
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
								type="text"
								inputMode="decimal"
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
							type="button"
							disabled={pending}
							aria-busy={pending}
							onClick={save}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							{pendingVisible ? (
								<LoaderCircle
									size={ICON_MD}
									aria-hidden="true"
									className="motion-safe:animate-spin"
								/>
							) : (
								<Check size={ICON_MD} aria-hidden="true" />
							)}
							Save
						</button>
						{saved ? <AdminNotice variant="success">Saved</AdminNotice> : null}
					</div>
				</div>
			) : null}

			{rowError ? (
				<AdminNotice variant="error" className="mt-3">
					{rowError}
				</AdminNotice>
			) : null}
		</li>
	);
}
