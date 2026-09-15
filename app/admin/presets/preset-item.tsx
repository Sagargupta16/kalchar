"use client";

import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { OrderPreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAdminDraftGuard } from "../_components/admin-draft-guard";
import { AdminNotice } from "../_components/admin-notice";
import {
	adminField,
	adminIconBtn,
	adminIconBtnDestructive,
	adminIconBtnPrimary,
	ICON_MD,
} from "../_components/controls";
import { usePendingVisible } from "../_components/use-admin-action";

export function usePresetDraftGuard(dirty: boolean) {
	useAdminDraftGuard(dirty);
}

export function PresetItem({
	preset,
	pending,
	saving,
	error,
	reorderHandle,
	onSave,
	onDelete,
}: Readonly<{
	preset: OrderPreset;
	pending: boolean;
	saving: boolean;
	error: string | null;
	reorderHandle: ReactNode;
	onSave: (label: string) => Promise<boolean>;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [label, setLabel] = useState(preset.label);
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const errorId = useId();
	const renameRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const restoreFocus = useRef(false);
	const spinning = usePendingVisible(saving);
	const editError = fieldError ?? (submitted ? error : null);
	usePresetDraftGuard(editing && label.trim() !== preset.label);

	useEffect(() => {
		if (!editing && !pending && restoreFocus.current) {
			restoreFocus.current = false;
			renameRef.current?.focus();
		}
	}, [editing, pending]);

	const finishEditing = () => {
		restoreFocus.current = true;
		setEditing(false);
		setFieldError(null);
		setSubmitted(false);
	};

	if (!editing) {
		return (
			<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 @sm/preset:flex">
				<div className="row-start-2">{reorderHandle}</div>
				<div className="col-span-3 row-start-1 min-w-0 flex-1">
					<p className="break-words text-sm font-medium text-ink">{preset.label}</p>
				</div>
				<button
					ref={renameRef}
					data-preset-rename=""
					type="button"
					disabled={pending}
					onClick={() => {
						setLabel(preset.label);
						setEditing(true);
					}}
					aria-label={`Rename ${preset.label}`}
					title="Rename"
					className={cn(adminIconBtn, "row-start-2")}
				>
					<Pencil size={ICON_MD} aria-hidden="true" />
				</button>
				<span className="row-start-2 flex border-l border-line pl-2">
					<button
						type="button"
						disabled={pending}
						onClick={onDelete}
						aria-label={`Delete ${preset.label}`}
						className={adminIconBtnDestructive}
					>
						<Trash2 size={ICON_MD} aria-hidden="true" />
					</button>
				</span>
			</div>
		);
	}

	return (
		<form
			noValidate
			className="flex flex-wrap items-center gap-2"
			onSubmit={async (event) => {
				event.preventDefault();
				if (pending) return;
				const trimmed = label.trim();
				if (!trimmed) {
					setFieldError("Enter an option label");
					inputRef.current?.focus();
					return;
				}
				setFieldError(null);
				setSubmitted(true);
				if (trimmed === preset.label || (await onSave(trimmed))) finishEditing();
			}}
		>
			<input
				ref={inputRef}
				disabled={pending}
				required
				value={label}
				onChange={(event) => {
					setLabel(event.target.value);
					setFieldError(null);
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !pending) {
						event.preventDefault();
						finishEditing();
					}
				}}
				aria-label={`Rename ${preset.label}`}
				aria-invalid={fieldError ? true : undefined}
				aria-describedby={editError ? errorId : undefined}
				enterKeyHint="done"
				className={cn(adminField, "min-w-0 flex-1")}
				// biome-ignore lint/a11y/noAutofocus: focus the field the user chose to edit
				autoFocus
			/>
			<button
				type="submit"
				disabled={pending}
				aria-busy={saving || undefined}
				aria-label={`Save ${preset.label}`}
				className={adminIconBtnPrimary}
			>
				{spinning ? (
					<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
				) : (
					<Check size={ICON_MD} aria-hidden="true" />
				)}
			</button>
			<span className="flex">
				<button
					type="button"
					disabled={pending}
					onClick={finishEditing}
					aria-label={`Cancel renaming ${preset.label}`}
					className={adminIconBtn}
				>
					<X size={ICON_MD} aria-hidden="true" />
				</button>
			</span>
			{editError ? (
				<AdminNotice id={errorId} variant="error" className="basis-full">
					{editError}
				</AdminNotice>
			) : null}
		</form>
	);
}
