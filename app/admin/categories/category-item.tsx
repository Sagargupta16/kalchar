"use client";

import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { Category } from "@/lib/types";
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

export function useCategoryDraftWarning(dirty: boolean) {
	useAdminDraftGuard(dirty);
}

export function CategoryItem({
	category,
	usageCount,
	editButtonId,
	pending,
	saving,
	error,
	reorderHandle,
	onEdit,
	onSave,
	onDelete,
}: Readonly<{
	category: Category;
	usageCount: number;
	editButtonId: string;
	pending: boolean;
	saving: boolean;
	error: string | null;
	reorderHandle: ReactNode;
	onEdit: () => void;
	onSave: (name: string) => Promise<boolean>;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(category.name);
	const [fieldError, setFieldError] = useState<string | null>(null);
	const editButtonRef = useRef<HTMLButtonElement>(null);
	const nameRef = useRef<HTMLInputElement>(null);
	const restoreFocus = useRef(false);
	const errorId = useId();
	const spinning = usePendingVisible(saving);
	const activeError = fieldError ?? error;
	useCategoryDraftWarning(editing && name.trim() !== category.name);

	useEffect(() => {
		if (editing || pending || !restoreFocus.current) return;
		restoreFocus.current = false;
		editButtonRef.current?.focus();
	}, [editing, pending]);

	const finishEditing = () => {
		restoreFocus.current = true;
		setEditing(false);
	};

	if (!editing) {
		return (
			<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 @sm/category:flex">
				<div className="row-start-2">{reorderHandle}</div>
				<div className="col-span-3 row-start-1 min-w-0 flex-1">
					<p className="break-words text-sm font-medium text-ink">{category.name}</p>
					<p className="text-label text-muted tabular-nums">
						{usageCount} {usageCount === 1 ? "piece" : "pieces"}
						{usageCount > 0 ? ", in use" : ""}
					</p>
					{usageCount > 0 ? (
						<p className="text-label text-muted">
							Reassign these pieces before deleting this category.
						</p>
					) : null}
				</div>
				<button
					id={editButtonId}
					ref={editButtonRef}
					type="button"
					disabled={pending}
					onClick={() => {
						onEdit();
						setFieldError(null);
						setName(category.name);
						setEditing(true);
					}}
					aria-label={`Rename ${category.name}`}
					title="Rename"
					className={cn(adminIconBtn, "row-start-2")}
				>
					<Pencil size={ICON_MD} aria-hidden="true" />
				</button>
				<span className="row-start-2 flex border-l border-line pl-2">
					<button
						type="button"
						disabled={pending || usageCount > 0}
						onClick={onDelete}
						aria-label={`Delete ${category.name}`}
						title={usageCount > 0 ? "Reassign its pieces before deleting" : "Delete category"}
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
			aria-label={`Rename ${category.name}`}
			aria-busy={saving || undefined}
			className="grid gap-2"
			onDragStart={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onKeyDown={(event) => {
				if (event.key !== "Escape" || pending) return;
				event.preventDefault();
				event.stopPropagation();
				finishEditing();
			}}
			onSubmit={async (event) => {
				event.preventDefault();
				if (pending) return;
				const trimmed = name.trim();
				if (!trimmed) {
					setFieldError("Enter a category name");
					nameRef.current?.focus();
					return;
				}
				setFieldError(null);
				if (trimmed === category.name || (await onSave(trimmed))) finishEditing();
			}}
		>
			<div className="flex items-center gap-2">
				<input
					ref={nameRef}
					disabled={pending}
					required
					value={name}
					onChange={(event) => {
						setName(event.target.value);
						setFieldError(null);
					}}
					aria-label={`Rename ${category.name}`}
					aria-invalid={fieldError ? true : undefined}
					aria-describedby={activeError ? errorId : undefined}
					enterKeyHint="done"
					autoCapitalize="words"
					autoComplete="off"
					className={cn(adminField, "min-w-0 flex-1")}
					// biome-ignore lint/a11y/noAutofocus: focus the field the user chose to edit
					autoFocus
				/>
				<button
					type="submit"
					disabled={pending}
					aria-label={`Save ${category.name}`}
					aria-busy={saving || undefined}
					className={adminIconBtnPrimary}
				>
					{spinning ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Check size={ICON_MD} aria-hidden="true" />
					)}
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={finishEditing}
					aria-label={`Cancel renaming ${category.name}`}
					className={adminIconBtn}
				>
					<X size={ICON_MD} aria-hidden="true" />
				</button>
			</div>
			{activeError ? (
				<AdminNotice id={errorId} variant="error">
					{activeError}
				</AdminNotice>
			) : null}
		</form>
	);
}
