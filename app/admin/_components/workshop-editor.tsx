"use client";

import { Check, LoaderCircle } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminBtnPrimary, adminField, adminLabel, ICON_MD } from "./controls";
import type { WorkshopDraft, WorkshopDraftError } from "./workshop-row";

export function WorkshopEditor({
	id,
	slug,
	title,
	formRef,
	errorId,
	pending,
	pendingVisible,
	draft,
	error,
	saved,
	onDraftChange,
	onChange,
	onSave,
	onCancel,
}: Readonly<{
	id: string;
	slug: string;
	title: string;
	formRef: RefObject<HTMLFormElement | null>;
	errorId: string;
	pending: boolean;
	pendingVisible: boolean;
	draft: WorkshopDraft;
	error: WorkshopDraftError | null;
	saved: boolean;
	onDraftChange: (field: keyof WorkshopDraft, value: string) => void;
	onChange: () => void;
	onSave: () => void;
	onCancel: () => void;
}>) {
	return (
		<form
			ref={formRef}
			id={id}
			noValidate
			aria-label={`Edit ${title}`}
			className="mt-3 border-t border-line pt-3"
			onChange={onChange}
			onSubmit={(event) => {
				event.preventDefault();
				onSave();
			}}
		>
			<div className="grid gap-(--form-gap) sm:grid-cols-2">
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`workshop-title-${slug}`}>Title *</label>
					<input
						id={`workshop-title-${slug}`}
						name="title"
						required
						aria-invalid={error?.field === "title" || undefined}
						aria-describedby={error?.field === "title" ? errorId : undefined}
						autoCorrect="off"
						disabled={pending}
						value={draft.title}
						onChange={(event) => onDraftChange("title", event.target.value)}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`workshop-blurb-${slug}`}>Description *</label>
					<textarea
						id={`workshop-blurb-${slug}`}
						name="blurb"
						required
						aria-invalid={error?.field === "blurb" || undefined}
						aria-describedby={error?.field === "blurb" ? errorId : undefined}
						rows={3}
						disabled={pending}
						value={draft.blurb}
						onChange={(event) => onDraftChange("blurb", event.target.value)}
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={`workshop-duration-${slug}`}>Duration (hours) (optional)</label>
					<input
						id={`workshop-duration-${slug}`}
						name="durationHours"
						type="text"
						inputMode="decimal"
						aria-invalid={error?.field === "durationHours" || undefined}
						aria-describedby={error?.field === "durationHours" ? errorId : undefined}
						placeholder="e.g. 2"
						disabled={pending}
						value={draft.durationHours}
						onChange={(event) => onDraftChange("durationHours", event.target.value)}
						className={adminField}
					/>
				</div>
			</div>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button type="button" disabled={pending} onClick={onCancel} className={adminBtn}>
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
	);
}
