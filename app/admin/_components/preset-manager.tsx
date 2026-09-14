"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrderPreset, OrderPresetKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	createOrderPreset,
	deleteOrderPreset,
	reorderOrderPresets,
	updateOrderPreset,
} from "../actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import {
	adminChipField,
	adminError,
	adminField,
	adminHelp,
	adminIconBtn,
	adminIconBtnDestructive,
	adminIconBtnPrimary,
	adminRowInset,
	ICON_MD,
} from "./controls";
import { InlineReorderControls } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

const GROUPS: Array<{ kind: OrderPresetKind; title: string; singular: string; hint: string }> = [
	{ kind: "size", title: "Sizes", singular: "size", hint: "For example A4 (8 x 12 inches)" },
	{ kind: "budget", title: "Budgets", singular: "budget", hint: "For example Under INR 5,000" },
	{
		kind: "timeline",
		title: "Timelines",
		singular: "timeline",
		hint: "For example Within a month",
	},
];

export function PresetManager({ presets }: Readonly<{ presets: OrderPreset[] }>) {
	return (
		// Tier 2e: the three groups sit side by side from lg (full-width layout).
		<div className="grid gap-(--space-group) lg:grid-cols-3 lg:items-start">
			{GROUPS.map((g) => (
				<PresetGroup
					key={g.kind}
					kind={g.kind}
					title={g.title}
					singular={g.singular}
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
	singular,
	hint,
	items: initial,
}: Readonly<{
	kind: OrderPresetKind;
	title: string;
	singular: string;
	hint: string;
	items: OrderPreset[];
}>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [baseline, setBaseline] = useState(initial);
	// Adopt fresh server data after a create (router.refresh), keeping the
	// reorder baseline in step.
	const [items, setItems] = useServerSyncedList(initial, setBaseline);
	const [saved, setSaved] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	// Which control the shared err belongs to: the order pair or the add form.
	const [errSlot, setErrSlot] = useState<"order" | "general">("general");
	const fieldId = useId();
	const { dragging, over, dragProps, move } = useReorder(items, setItems, pending);

	const handleSaveOrder = () => {
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderOrderPresets(items.map((i) => i.id)),
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
			() => deleteOrderPreset(id),
			() => {
				setItems((prev) => prev.filter((i) => i.id !== id));
				setBaseline((prev) => prev.filter((i) => i.id !== id));
			},
		);
	};

	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);
	const generalError = errSlot === "general" ? err : null;

	return (
		<AdminPanel
			title={title}
			description={hint}
			className="min-w-0"
			action={
				hasOrderChanges ? (
					<InlineReorderControls
						layout="column"
						className="sm:flex-row sm:items-center"
						pending={pending}
						saved={false}
						error={errSlot === "order" ? err : null}
						onSave={handleSaveOrder}
						onReset={() => setItems(baseline)}
					/>
				) : saved ? (
					// The shell's InlineReorderControls keeps its buttons while `saved`, which
					// would leave a dead Save order on screen; only its output line renders here.
					<output className="text-sm text-accent-text">Order saved</output>
				) : null
			}
		>
			<ul className="space-y-tight">
				{items.map((p, i) => (
					<li
						key={p.id}
						{...dragProps(i)}
						className={cn(
							adminRowInset,
							dragging === i && "scale-[0.98] opacity-60 shadow-e3 select-none",
							over === i && dragging !== i && "border-accent shadow-e1",
						)}
					>
						<PresetItem
							preset={p}
							pending={pending}
							reorderHandle={
								<ReorderHandle
									label={p.label}
									index={i}
									count={items.length}
									disabled={pending}
									onMove={(to) => move(i, to)}
								/>
							}
							onSave={(label) => {
								setErrSlot("general");
								return run(() => updateOrderPreset(p.id, label));
							}}
							onDelete={async () => {
								const ok = await confirm({
									title: `Delete "${p.label}"?`,
									body: "It will no longer appear on the custom-order form.",
									confirmLabel: "Delete option",
									cancelLabel: "Keep option",
								});
								if (ok) handleDelete(p.id);
							}}
						/>
					</li>
				))}
				{items.length === 0 ? (
					<EmptyState as="li" variant="nested">
						No {title.toLowerCase()} yet. Add the first one below.
					</EmptyState>
				) : null}
			</ul>

			{items.length > 0 ? (
				// Preview strip (Tier 2e): the group's presets in the public chip recipe,
				// in the staged order, so a preset is never a mystery string. Decorative;
				// the real list above carries the accessible content.
				<div aria-hidden="true" className="mt-4">
					<div className="flex flex-wrap gap-2">
						{items.map((p) => (
							<span
								key={p.id}
								className="inline-flex h-6 items-center rounded-full border border-line bg-bg px-2.5 text-micro text-ink"
							>
								{p.label}
							</span>
						))}
					</div>
					<p className={cn(adminHelp, "mt-1")}>How the order form shows them</p>
				</div>
			) : null}

			{/* Chip-shaped add field (Tier 2e): bare input left, round primary +
			    inside the pill's right end. The visible label moves to aria-label. */}
			<form
				className={cn(adminChipField, "mt-4")}
				onSubmit={(e) => {
					e.preventDefault();
					const label = newLabel.trim();
					if (!label) {
						setFieldError(`Enter a ${singular} option`);
						return;
					}
					setFieldError(null);
					setErrSlot("general");
					run(
						() => createOrderPreset(kind, label),
						() => setNewLabel(""),
					);
				}}
			>
				<input
					id={fieldId}
					value={newLabel}
					onChange={(e) => {
						setNewLabel(e.target.value);
						if (fieldError) setFieldError(null);
					}}
					required
					enterKeyHint="done"
					autoComplete="off"
					placeholder={`New ${singular}`}
					aria-label={`New ${singular} option`}
					aria-invalid={fieldError ? true : undefined}
					aria-describedby={fieldError ? `${fieldId}-error` : undefined}
					className="min-h-10 w-full border-0 bg-transparent text-base text-ink placeholder:text-muted"
				/>
				<button
					type="submit"
					disabled={pending}
					aria-label={`Add ${singular}`}
					className={cn(adminIconBtnPrimary, "rounded-full")}
				>
					<Plus size={ICON_MD} aria-hidden="true" />
				</button>
			</form>
			{fieldError ? (
				<p id={`${fieldId}-error`} className={cn(adminError, "mt-1")}>
					{fieldError}
				</p>
			) : null}
			{generalError ? (
				<AdminNotice variant="error" className="mt-3">
					{generalError}
				</AdminNotice>
			) : null}
		</AdminPanel>
	);
}

function PresetItem({
	preset,
	pending,
	reorderHandle,
	onSave,
	onDelete,
}: Readonly<{
	preset: OrderPreset;
	pending: boolean;
	reorderHandle: React.ReactNode;
	onSave: (label: string) => Promise<boolean>;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [label, setLabel] = useState(preset.label);

	if (!editing) {
		return (
			<div className="flex items-center gap-3">
				{reorderHandle}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-ink">{preset.label}</p>
				</div>
				<button
					type="button"
					disabled={pending}
					onClick={() => {
						setLabel(preset.label);
						setEditing(true);
					}}
					aria-label={`Rename ${preset.label}`}
					title="Rename"
					className={adminIconBtn}
				>
					<Pencil size={ICON_MD} aria-hidden="true" />
				</button>
				<span className="ml-4 flex border-l border-line pl-4">
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

	// A form so the phone keyboard's return key saves and Escape cancels.
	return (
		<form
			className="flex items-center gap-3"
			onSubmit={async (e) => {
				e.preventDefault();
				if (await onSave(label.trim())) setEditing(false);
			}}
		>
			<input
				disabled={pending}
				value={label}
				onChange={(e) => setLabel(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						setLabel(preset.label);
						setEditing(false);
					}
				}}
				aria-label={`Rename ${preset.label}`}
				enterKeyHint="done"
				className={adminField}
				// biome-ignore lint/a11y/noAutofocus: focus the field the user chose to edit
				autoFocus
			/>
			<button
				type="submit"
				disabled={pending}
				aria-label={`Save ${preset.label}`}
				className={adminIconBtnPrimary}
			>
				<Check size={ICON_MD} aria-hidden="true" />
			</button>
			<span className="ml-4 flex border-l border-line pl-4">
				<button
					type="button"
					disabled={pending}
					onClick={() => {
						setLabel(preset.label);
						setEditing(false);
					}}
					aria-label={`Cancel renaming ${preset.label}`}
					className={adminIconBtn}
				>
					<X size={ICON_MD} aria-hidden="true" />
				</button>
			</span>
		</form>
	);
}
