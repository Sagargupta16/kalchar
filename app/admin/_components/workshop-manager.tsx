"use client";

import { Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Workshop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createWorkshop, deleteWorkshop, reorderWorkshops, updateWorkshop } from "../actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";
import { ReorderBar } from "./reorder-bar";
import { useReorder } from "./use-reorder";

export function WorkshopManager({ workshops: initial }: Readonly<{ workshops: Workshop[] }>) {
	const router = useRouter();
	const confirm = useConfirm();
	const [items, setItems] = useState(initial);
	const [baseline, setBaseline] = useState(initial);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const [err, setErr] = useState<string | null>(null);
	const { dragging, over, dragProps } = useReorder(items, setItems);

	function run(fn: () => Promise<void>, after?: () => void) {
		setErr(null);
		startTransition(async () => {
			try {
				await fn();
				after?.();
				router.refresh();
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Failed.");
			}
		});
	}

	const handleSaveOrder = () =>
		run(
			() => reorderWorkshops(items.map((i) => i.slug)),
			() => {
				setBaseline(items);
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			},
		);

	const handleDelete = (slug: string) => {
		setItems((prev) => prev.filter((i) => i.slug !== slug));
		setBaseline((prev) => prev.filter((i) => i.slug !== slug));
		run(() => deleteWorkshop(slug));
	};

	const hasOrderChanges = items.some((item, i) => item.slug !== baseline[i]?.slug);

	return (
		<div className="space-y-6">
			{/* Create form */}
			<CreateWorkshopForm
				pending={pending}
				onCreate={(fd, reset) => run(() => createWorkshop(fd).then(() => undefined), reset)}
			/>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			{/* List */}
			<div role="list" className="space-y-2">
				{items.map((w, i) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop reorder
					<div
						role="listitem"
						key={w.slug}
						{...dragProps(i)}
						className={cn(
							"rounded-(--radius-sm) border border-line bg-bg transition-all duration-(--duration-fast)",
							dragging === i && "opacity-50",
							over === i && dragging !== i && "border-accent shadow-sm",
						)}
					>
						<WorkshopItem
							workshop={w}
							pending={pending}
							onSave={(fields) => run(() => updateWorkshop(w.slug, fields))}
							onDelete={async () => {
								const ok = await confirm({
									title: `Delete "${w.title}"?`,
									body: "This removes the workshop from the public site.",
									confirmLabel: "Delete",
								});
								if (ok) handleDelete(w.slug);
							}}
						/>
					</div>
				))}
				{items.length === 0 ? (
					<p className="rounded-(--radius-sm) border border-dashed border-line p-6 text-center text-sm text-muted">
						No workshops yet. Add one above.
					</p>
				) : null}
			</div>

			{hasOrderChanges ? (
				<ReorderBar
					label="Workshop order changed"
					pending={pending}
					saved={saved}
					onSave={handleSaveOrder}
					onReset={() => setItems(baseline)}
				/>
			) : null}
		</div>
	);
}

function CreateWorkshopForm({
	pending,
	onCreate,
}: Readonly<{ pending: boolean; onCreate: (fd: FormData, reset: () => void) => void }>) {
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const form = e.currentTarget;
				onCreate(new FormData(form), () => form.reset());
			}}
			className="rounded-(--radius-md) border border-line bg-bg-soft p-4"
		>
			<p className="mb-3 text-xs font-medium text-muted">Add a workshop</p>
			<div className="grid gap-3 sm:grid-cols-2">
				<input name="title" placeholder="Title *" required className={adminField} />
				<input
					name="durationHours"
					type="number"
					step="0.5"
					min="0"
					placeholder="Duration (hours)"
					className={adminField}
				/>
				<textarea
					name="blurb"
					placeholder="Blurb *"
					rows={2}
					required
					className={`${adminField} sm:col-span-2`}
				/>
			</div>
			<button type="submit" disabled={pending} className={`${adminBtnPrimary} mt-3`}>
				<Plus size={14} />
				Add workshop
			</button>
		</form>
	);
}

function WorkshopItem({
	workshop,
	pending,
	onSave,
	onDelete,
}: Readonly<{
	workshop: Workshop;
	pending: boolean;
	onSave: (fields: { title: string; blurb: string; durationHours: number | null }) => void;
	onDelete: () => void;
}>) {
	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState(workshop.title);
	const [blurb, setBlurb] = useState(workshop.blurb);
	const [duration, setDuration] = useState(workshop.durationHours?.toString() ?? "");

	if (!editing) {
		return (
			<div className="flex items-center gap-3 p-3">
				<span className="cursor-grab text-muted active:cursor-grabbing">
					<GripVertical size={16} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{workshop.title}</p>
					<p className="truncate text-xs text-muted">{workshop.blurb}</p>
				</div>
				{workshop.durationHours ? (
					<span className="t-meta shrink-0 text-[0.65rem]">{workshop.durationHours}h</span>
				) : null}
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
		<div className="space-y-2 p-3">
			<input
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				className={`${adminField} w-full`}
				placeholder="Title"
			/>
			<textarea
				value={blurb}
				onChange={(e) => setBlurb(e.target.value)}
				rows={2}
				className={`${adminField} w-full`}
				placeholder="Blurb"
			/>
			<div className="flex items-center gap-2">
				<input
					value={duration}
					onChange={(e) => setDuration(e.target.value)}
					type="number"
					step="0.5"
					min="0"
					placeholder="Hours"
					className={`${adminField} w-28`}
				/>
				<button
					type="button"
					disabled={pending}
					onClick={() => {
						const d = duration ? Number(duration) : null;
						onSave({
							title: title.trim(),
							blurb: blurb.trim(),
							durationHours: d && !Number.isNaN(d) ? d : null,
						});
						setEditing(false);
					}}
					className={`${adminBtnPrimary} px-3 py-1.5`}
				>
					<Check size={14} />
					Save
				</button>
				<button
					type="button"
					onClick={() => {
						setTitle(workshop.title);
						setBlurb(workshop.blurb);
						setDuration(workshop.durationHours?.toString() ?? "");
						setEditing(false);
					}}
					className={`${adminBtn} px-3 py-1.5`}
				>
					<X size={14} />
					Cancel
				</button>
			</div>
		</div>
	);
}
