"use client";

import { Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { OrderPreset, OrderPresetKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	createOrderPreset,
	deleteOrderPreset,
	reorderOrderPresets,
	updateOrderPreset,
} from "../actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";
import { useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

const GROUPS: Array<{ kind: OrderPresetKind; title: string; hint: string }> = [
	{ kind: "size", title: "Sizes", hint: "e.g. A4 (8 x 12 inches)" },
	{ kind: "budget", title: "Budgets", hint: "e.g. Under INR 5,000" },
	{ kind: "timeline", title: "Timelines", hint: "e.g. Within a month" },
];

export function PresetManager({ presets }: Readonly<{ presets: OrderPreset[] }>) {
	return (
		<div className="space-y-8">
			{GROUPS.map((g) => (
				<PresetGroup
					key={g.kind}
					kind={g.kind}
					title={g.title}
					hint={g.hint}
					items={presets.filter((p) => p.kind === g.kind)}
				/>
			))}
		</div>
	);
}

function PresetGroup({
	kind,
	title,
	hint,
	items: initial,
}: Readonly<{
	kind: OrderPresetKind;
	title: string;
	hint: string;
	items: OrderPreset[];
}>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [baseline, setBaseline] = useState(initial);
	// Adopt fresh server data after a create (router.refresh), keeping the
	// reorder baseline in step.
	const [items, setItems] = useServerSyncedList(initial, setBaseline);
	const [newLabel, setNewLabel] = useState("");
	const { dragging, over, dragProps } = useReorder(items, setItems);

	const handleDelete = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		setBaseline((prev) => prev.filter((i) => i.id !== id));
		run(() => deleteOrderPreset(id));
	};

	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);

	return (
		<section className="rounded-(--radius-md) border border-line bg-bg p-4 sm:p-5">
			<div className="mb-3 flex items-baseline justify-between gap-3">
				<h3 className="text-sm font-semibold">{title}</h3>
				{hasOrderChanges ? (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setItems(baseline)}
							disabled={pending}
							className={`${adminBtn} px-2.5 py-1 text-xs`}
						>
							Reset
						</button>
						<button
							type="button"
							onClick={() =>
								run(
									() => reorderOrderPresets(items.map((i) => i.id)),
									() => setBaseline(items),
								)
							}
							disabled={pending}
							className={`${adminBtn} px-2.5 py-1 text-xs border-accent text-accent`}
						>
							Save order
						</button>
					</div>
				) : null}
			</div>

			{/* List */}
			<ul className="space-y-2">
				{items.map((p, i) => (
					<li
						key={p.id}
						{...dragProps(i)}
						className={cn(
							"rounded-(--radius-sm) border border-line bg-bg-soft transition-all duration-(--duration-fast)",
							dragging === i && "opacity-50",
							over === i && dragging !== i && "border-accent shadow-sm",
						)}
					>
						<PresetItem
							preset={p}
							pending={pending}
							onSave={(label) => run(() => updateOrderPreset(p.id, label))}
							onDelete={async () => {
								const ok = await confirm({
									title: `Remove "${p.label}"?`,
									body: "This option will no longer appear on the custom-order form.",
									confirmLabel: "Remove",
								});
								if (ok) handleDelete(p.id);
							}}
						/>
					</li>
				))}
				{items.length === 0 ? (
					<p className="rounded-(--radius-sm) border border-dashed border-line p-4 text-center text-xs text-muted">
						No options yet.
					</p>
				) : null}
			</ul>

			{/* Add */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!newLabel.trim()) return;
					run(
						() => createOrderPreset(kind, newLabel),
						() => setNewLabel(""),
					);
				}}
				className="mt-3 flex items-center gap-2"
			>
				<input
					value={newLabel}
					onChange={(e) => setNewLabel(e.target.value)}
					placeholder={hint}
					className={`${adminField} flex-1`}
				/>
				<button type="submit" disabled={pending} className={adminBtnPrimary}>
					<Plus size={14} />
					Add
				</button>
			</form>

			{err ? <p className="mt-2 text-xs text-ruby">{err}</p> : null}
		</section>
	);
}

function PresetItem({
	preset,
	pending,
	onSave,
	onDelete,
}: Readonly<{
	preset: OrderPreset;
	pending: boolean;
	onSave: (label: string) => void;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [label, setLabel] = useState(preset.label);

	if (!editing) {
		return (
			<div className="flex items-center gap-3 p-2.5">
				<span className="cursor-grab text-muted active:cursor-grabbing">
					<GripVertical size={14} />
				</span>
				<span className="flex-1 truncate text-sm">{preset.label}</span>
				<button type="button" onClick={() => setEditing(true)} className={`${adminBtn} px-2 py-1`}>
					Edit
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={onDelete}
					className={`${adminBtnDestructive} px-2 py-1`}
				>
					<Trash2 size={12} />
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 p-2.5">
			<input
				value={label}
				onChange={(e) => setLabel(e.target.value)}
				className={`${adminField} flex-1`}
				// biome-ignore lint/a11y/noAutofocus: focus the field the user just chose to edit
				autoFocus
			/>
			<button
				type="button"
				disabled={pending}
				onClick={() => {
					onSave(label.trim());
					setEditing(false);
				}}
				className={`${adminBtnPrimary} px-2.5 py-1.5`}
			>
				<Check size={14} />
			</button>
			<button
				type="button"
				onClick={() => {
					setLabel(preset.label);
					setEditing(false);
				}}
				className={`${adminBtn} px-2.5 py-1.5`}
			>
				<X size={14} />
			</button>
		</div>
	);
}
