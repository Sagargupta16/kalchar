"use client";

import { Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createCategory, deleteCategory, renameCategory, reorderCategories } from "../actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";
import { ReorderBar } from "./reorder-bar";
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
	const { dragging, over, dragProps } = useReorder(items, setItems);

	const handleSaveOrder = () =>
		run(
			() => reorderCategories(items.map((i) => i.id)),
			() => {
				setBaseline(items);
				setSaved(true);
				setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);

	const handleDelete = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		setBaseline((prev) => prev.filter((i) => i.id !== id));
		run(() => deleteCategory(id));
	};

	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);

	return (
		<div className="space-y-6">
			{/* Add */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!newName.trim()) return;
					run(
						() => createCategory(newName),
						() => setNewName(""),
					);
				}}
				className="rounded-(--radius-md) border border-line bg-bg-soft p-4"
			>
				<p className="mb-3 text-xs font-medium text-muted">Add a category</p>
				<div className="flex items-center gap-2">
					<input
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						placeholder="e.g. Warli, Kalamkari, Tanjore"
						className={`${adminField} flex-1`}
					/>
					<button type="submit" disabled={pending} className={adminBtnPrimary}>
						<Plus size={14} />
						Add
					</button>
				</div>
			</form>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			{/* List */}
			<ul className="space-y-2">
				{items.map((c, i) => (
					<li
						key={c.id}
						{...dragProps(i)}
						className={cn(
							"rounded-(--radius-sm) border border-line bg-bg transition-all duration-(--duration-fast)",
							dragging === i && "opacity-50",
							over === i && dragging !== i && "border-accent shadow-sm",
						)}
					>
						<CategoryItem
							category={c}
							usageCount={usage[c.name] ?? 0}
							pending={pending}
							onSave={(name) => run(() => renameCategory(c.id, name))}
							onDelete={async () => {
								const ok = await confirm({
									title: `Delete category "${c.name}"?`,
									body: "Pieces must be reassigned first; this only removes the empty category.",
									confirmLabel: "Delete",
								});
								if (ok) handleDelete(c.id);
							}}
						/>
					</li>
				))}
				{items.length === 0 ? (
					<p className="rounded-(--radius-sm) border border-dashed border-line p-6 text-center text-sm text-muted">
						No categories yet. Add one above.
					</p>
				) : null}
			</ul>

			{hasOrderChanges ? (
				<ReorderBar
					label="Category order changed"
					pending={pending}
					saved={saved}
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
	onSave,
	onDelete,
}: Readonly<{
	category: Category;
	usageCount: number;
	pending: boolean;
	onSave: (name: string) => void;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(category.name);

	if (!editing) {
		return (
			<div className="flex items-center gap-3 p-3">
				<span className="cursor-grab text-muted active:cursor-grabbing">
					<GripVertical size={16} />
				</span>
				<span className="flex-1 truncate text-sm font-medium">{category.name}</span>
				<span className="t-meta shrink-0 text-[0.65rem]">
					{usageCount} {usageCount === 1 ? "piece" : "pieces"}
				</span>
				<button type="button" onClick={() => setEditing(true)} className={`${adminBtn} px-2 py-1`}>
					Rename
				</button>
				<button
					type="button"
					disabled={pending || usageCount > 0}
					onClick={onDelete}
					title={usageCount > 0 ? "Reassign its pieces before deleting" : "Delete category"}
					className={`${adminBtnDestructive} px-2 py-1`}
				>
					<Trash2 size={12} />
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 p-3">
			<input
				value={name}
				onChange={(e) => setName(e.target.value)}
				className={`${adminField} flex-1`}
				// biome-ignore lint/a11y/noAutofocus: focus the field the user chose to edit
				autoFocus
			/>
			<button
				type="button"
				disabled={pending}
				onClick={() => {
					onSave(name.trim());
					setEditing(false);
				}}
				className={`${adminBtnPrimary} px-2.5 py-1.5`}
			>
				<Check size={14} />
			</button>
			<button
				type="button"
				onClick={() => {
					setName(category.name);
					setEditing(false);
				}}
				className={`${adminBtn} px-2.5 py-1.5`}
			>
				<X size={14} />
			</button>
		</div>
	);
}
