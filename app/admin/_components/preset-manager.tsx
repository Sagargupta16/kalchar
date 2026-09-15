"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { unwrap } from "@/lib/action-result";
import type { OrderPreset, OrderPresetKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	createOrderPreset,
	deleteOrderPreset,
	reorderOrderPresets,
	updateOrderPreset,
} from "../actions";
import { PresetItem, usePresetDraftGuard } from "../presets/preset-item";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import {
	adminChipField,
	adminHelp,
	adminIconBtnPrimary,
	adminLabel,
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
	const router = useRouter();
	const { pending, pendingVisible, err, run } = useAdminAction();
	const [baseline, setBaseline] = useServerSyncedList(initial);
	const [orderedIds, setOrderedIds] = useState<string[] | null>(null);
	// Keep the draft order separate so refreshed labels, additions and deletions
	// can appear without replacing the order the maintainer is arranging.
	const items = orderedIds
		? [
				...orderedIds.flatMap((id) => baseline.filter((item) => item.id === id)),
				...baseline.filter((item) => !orderedIds.includes(item.id)),
			]
		: baseline;
	const [saved, setSaved] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [errSlot, setErrSlot] = useState<"order" | "create" | { id: string }>("create");
	const fieldId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const refocusInput = useRef(false);
	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);
	const { dragging, over, dragProps, move } = useReorder(
		items,
		(next) => {
			setOrderedIds(next.map((item) => item.id));
			setSaved(false);
		},
		pending,
	);
	usePresetDraftGuard(hasOrderChanges || newLabel.trim().length > 0);

	useEffect(() => {
		if (!hasOrderChanges) setOrderedIds(null);
	}, [hasOrderChanges]);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	useEffect(() => {
		if (!pending && refocusInput.current) {
			refocusInput.current = false;
			inputRef.current?.focus();
		}
	}, [pending]);

	const handleSaveOrder = () => {
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderOrderPresets(items.map((i) => i.id)),
			() => {
				setBaseline(items);
				setOrderedIds(null);
				setSaved(true);
			},
		);
	};

	const handleDelete = async (preset: OrderPreset) => {
		const index = items.findIndex((item) => item.id === preset.id);
		const ok = await confirm({
			title: `Delete "${preset.label}"?`,
			body: "It will no longer appear on the custom-order form.",
			confirmLabel: "Delete option",
			cancelLabel: "Keep option",
			action: async () => {
				unwrap(await deleteOrderPreset(preset.id));
				return true;
			},
		});
		if (!ok) return;
		setBaseline((prev) => prev.filter((item) => item.id !== preset.id));
		router.refresh();
		requestAnimationFrame(() => {
			const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
				"button[data-preset-rename]",
			);
			(buttons?.[Math.min(index, buttons.length - 1)] ?? inputRef.current)?.focus();
		});
	};

	const createError = fieldError ?? (errSlot === "create" ? err : null);

	return (
		<AdminPanel
			title={title}
			description={hint}
			className="@container/preset-group min-w-0"
			action={
				hasOrderChanges ? (
					<InlineReorderControls
						layout="column"
						className="@sm/preset-group:flex-row @sm/preset-group:items-center"
						pending={pending}
						saved={false}
						error={errSlot === "order" ? err : null}
						onSave={handleSaveOrder}
						onReset={() => {
							setOrderedIds(null);
							setSaved(false);
						}}
					/>
				) : saved ? (
					// The shell's InlineReorderControls keeps its buttons while `saved`, which
					// would leave a dead Save order on screen; only its output line renders here.
					<output className="text-sm text-accent-text">Order saved</output>
				) : null
			}
		>
			<ul ref={listRef} className="space-y-tight">
				{items.map((p, i) => (
					<li
						key={p.id}
						{...dragProps(i)}
						className={cn(
							adminRowInset,
							"@container/preset",
							dragging === i && "scale-[0.98] opacity-60 shadow-e3 select-none",
							over === i && dragging !== i && "border-accent shadow-e1",
						)}
					>
						<PresetItem
							preset={p}
							pending={pending}
							saving={pending && typeof errSlot === "object" && errSlot.id === p.id}
							error={typeof errSlot === "object" && errSlot.id === p.id ? err : null}
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
								setErrSlot({ id: p.id });
								return run(
									() => updateOrderPreset(p.id, label),
									() =>
										setBaseline((prev) =>
											prev.map((item) => (item.id === p.id ? { ...item, label } : item)),
										),
								);
							}}
							onDelete={() => handleDelete(p)}
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
								className="inline-flex h-6 items-center rounded-full border border-line bg-bg px-3 text-micro text-ink"
							>
								{p.label}
							</span>
						))}
					</div>
					<p className={cn(adminHelp, "mt-1")}>How the order form shows them</p>
				</div>
			) : null}

			<label htmlFor={fieldId} className={cn(adminLabel, "mt-4")}>
				New {singular} option
			</label>
			<form
				noValidate
				aria-label={`Add ${singular} option`}
				className={cn(adminChipField, "mt-2")}
				onSubmit={(e) => {
					e.preventDefault();
					if (pending) return;
					const label = newLabel.trim();
					if (!label) {
						setFieldError(`Enter a ${singular} option`);
						inputRef.current?.focus();
						return;
					}
					setFieldError(null);
					setErrSlot("create");
					run(
						() => createOrderPreset(kind, label),
						() => {
							setNewLabel("");
							refocusInput.current = true;
						},
					);
				}}
			>
				<input
					ref={inputRef}
					id={fieldId}
					disabled={pending}
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
					aria-describedby={createError ? `${fieldId}-error` : undefined}
					className="min-h-control min-w-0 w-full border-0 bg-transparent text-base text-ink placeholder:text-muted"
				/>
				<button
					type="submit"
					disabled={pending}
					aria-busy={(pending && errSlot === "create") || undefined}
					aria-label={`Add ${singular}`}
					className={cn(adminIconBtnPrimary, "rounded-full")}
				>
					{pendingVisible && errSlot === "create" ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
				</button>
			</form>
			{createError ? (
				<AdminNotice id={`${fieldId}-error`} variant="error" className="mt-3">
					{createError}
				</AdminNotice>
			) : null}
		</AdminPanel>
	);
}
