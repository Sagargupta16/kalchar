"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createCategory, deleteCategory, renameCategory, reorderCategories } from "../actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import {
	adminBtnPrimary,
	adminError,
	adminField,
	adminIconBtn,
	adminIconBtnDestructive,
	adminIconBtnPrimary,
	adminLabel,
	adminPanelInset,
	adminRow,
	ICON_MD,
} from "./controls";
import { ReorderBar } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

/** Map of category name -> how many artworks use it (for the delete guard hint). */
type UsageMap = Record<string, number>;

export function CategoryManager({
	categories: initial,
	usage,
}: Readonly<{ categories: Category[]; usage: UsageMap }>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [baseline, setBaseline] = useState(initial);
	// Adopt fresh server data after a create (router.refresh), keeping the
	// reorder baseline in step.
	const [items, setItems] = useServerSyncedList(initial, setBaseline);
	const [saved, setSaved] = useState(false);
	const [newName, setNewName] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [added, setAdded] = useState<string | null>(null);
	// Which control the shared err belongs to: the reorder bar or the form panel.
	const [errSlot, setErrSlot] = useState<"order" | "general">("general");
	const formId = useId();
	const { dragging, over, dragProps, move } = useReorder(items, setItems, pending);

	const handleSaveOrder = () => {
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderCategories(items.map((i) => i.id)),
			() => {
				setBaseline(items);
				setSaved(true);
				setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const handleDelete = (id: string) => {
		setErrSlot("general");
		run(
			() => deleteCategory(id),
			() => {
				setItems((prev) => prev.filter((i) => i.id !== id));
				setBaseline((prev) => prev.filter((i) => i.id !== id));
			},
		);
	};

	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);
	const generalError = errSlot === "general" ? err : null;

	return (
		<div className="space-y-group">
			{/* Ruling 42: the create form and the list are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<form
					aria-labelledby={`${formId}-title`}
					className={cn(adminPanelInset, "min-w-0")}
					onSubmit={(e) => {
						e.preventDefault();
						const name = newName.trim();
						if (!name) {
							setFieldError("Enter a category name");
							return;
						}
						setFieldError(null);
						setAdded(null);
						setErrSlot("general");
						run(
							() => createCategory(name),
							() => {
								setNewName("");
								setAdded(name);
								setTimeout(() => setAdded(null), SAVED_BADGE_DURATION_MS);
							},
						);
					}}
				>
					<AdminPanelHeader
						id={`${formId}-title`}
						as="h2"
						title="Add a category"
						description="The style name as it should read in the gallery filter, for example Warli or Kalamkari."
					/>
					<div className="flex flex-col gap-(--form-gap) sm:flex-row sm:items-end">
						<label htmlFor={`${formId}-name`} className={cn(adminLabel, "flex-1")}>
							Category name
							<input
								id={`${formId}-name`}
								value={newName}
								onChange={(e) => {
									setNewName(e.target.value);
									if (fieldError) setFieldError(null);
								}}
								required
								autoCapitalize="words"
								autoComplete="off"
								enterKeyHint="done"
								aria-invalid={fieldError ? true : undefined}
								aria-describedby={fieldError ? `${formId}-error` : undefined}
								className={adminField}
							/>
						</label>
						<button
							type="submit"
							disabled={pending}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							<Plus size={ICON_MD} aria-hidden="true" />
							Add category
						</button>
					</div>
					{fieldError ? (
						<p id={`${formId}-error`} className={cn(adminError, "mt-1")}>
							{fieldError}
						</p>
					) : null}
					{generalError ? (
						<AdminNotice variant="error" className="mt-3">
							{generalError}
						</AdminNotice>
					) : null}
					{added ? (
						<AdminNotice variant="success" className="mt-3">
							Added "{added}" at the end of the list.
						</AdminNotice>
					) : null}
				</form>

				<ul className="min-w-0 space-y-tight">
					{items.map((c, i) => (
						<li
							key={c.id}
							{...dragProps(i)}
							className={cn(
								adminRow,
								dragging === i && "opacity-50",
								over === i && dragging !== i && "border-accent shadow-e1",
							)}
						>
							<CategoryItem
								category={c}
								usageCount={usage[c.name] ?? 0}
								pending={pending}
								reorderHandle={
									<ReorderHandle
										label={c.name}
										index={i}
										count={items.length}
										disabled={pending}
										onMove={(to) => move(i, to)}
									/>
								}
								onSave={(name) => {
									setErrSlot("general");
									return run(() => renameCategory(c.id, name));
								}}
								onDelete={async () => {
									const ok = await confirm({
										title: `Delete category "${c.name}"?`,
										body: "It will disappear from the gallery filter and the custom-order style picker.",
										confirmLabel: "Delete category",
										cancelLabel: "Keep category",
									});
									if (ok) handleDelete(c.id);
								}}
							/>
						</li>
					))}
					{items.length === 0 ? (
						<EmptyState as="li" variant="compact" voice="tool" title="No categories yet">
							Add the first one above. It appears in the gallery filter as soon as it is saved.
						</EmptyState>
					) : null}
				</ul>
			</div>

			{hasOrderChanges || saved ? (
				<ReorderBar
					label="Category order changed"
					pending={pending}
					saved={saved}
					error={errSlot === "order" ? err : null}
					onSave={handleSaveOrder}
					onReset={() => setItems(baseline)}
				/>
			) : null}
		</div>
	);
}

function CategoryItem({
	category,
	usageCount,
	pending,
	reorderHandle,
	onSave,
	onDelete,
}: Readonly<{
	category: Category;
	usageCount: number;
	pending: boolean;
	reorderHandle: React.ReactNode;
	onSave: (name: string) => Promise<boolean>;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(category.name);

	if (!editing) {
		return (
			<div className="flex items-center gap-3">
				{reorderHandle}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-ink">{category.name}</p>
					<p className="text-label text-muted tabular-nums">
						{usageCount} {usageCount === 1 ? "piece" : "pieces"}
						{usageCount > 0 ? ", in use" : ""}
					</p>
				</div>
				<button
					type="button"
					disabled={pending}
					onClick={() => {
						setName(category.name);
						setEditing(true);
					}}
					aria-label={`Rename ${category.name}`}
					title="Rename"
					className={adminIconBtn}
				>
					<Pencil size={ICON_MD} aria-hidden="true" />
				</button>
				<span className="ml-4 flex border-l border-line pl-4">
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

	// A form so the phone keyboard's return key saves and Escape cancels.
	return (
		<form
			className="flex items-center gap-3"
			onSubmit={async (e) => {
				e.preventDefault();
				if (await onSave(name.trim())) setEditing(false);
			}}
		>
			<input
				disabled={pending}
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						setName(category.name);
						setEditing(false);
					}
				}}
				aria-label={`Rename ${category.name}`}
				enterKeyHint="done"
				autoCapitalize="words"
				className={adminField}
				// biome-ignore lint/a11y/noAutofocus: focus the field the user chose to edit
				autoFocus
			/>
			<button
				type="submit"
				disabled={pending}
				aria-label={`Save ${category.name}`}
				className={adminIconBtnPrimary}
			>
				<Check size={ICON_MD} aria-hidden="true" />
			</button>
			<span className="ml-4 flex border-l border-line pl-4">
				<button
					type="button"
					disabled={pending}
					onClick={() => {
						setName(category.name);
						setEditing(false);
					}}
					aria-label={`Cancel renaming ${category.name}`}
					className={adminIconBtn}
				>
					<X size={ICON_MD} aria-hidden="true" />
				</button>
			</span>
		</form>
	);
}
