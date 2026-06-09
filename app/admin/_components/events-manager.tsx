"use client";

import { CalendarDays, GripVertical, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createEvent, deleteEvent, reorderEvents, setEventFeatured } from "../actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";
import { EventImageManager } from "./event-image-manager";
import { EventMetaEditor } from "./event-meta-editor";
import { ReorderBar } from "./reorder-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";

export function EventsManager({ events: initial }: Readonly<{ events: Event[] }>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [items, setItems] = useState(initial);
	const [baseline, setBaseline] = useState(initial);
	const [saved, setSaved] = useState(false);
	const { dragging, over, dragProps } = useReorder(items, setItems);

	const handleSaveOrder = () =>
		run(
			() => reorderEvents(items.map((i) => i.id)),
			() => {
				setBaseline(items);
				setSaved(true);
				setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);

	const handleDelete = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		setBaseline((prev) => prev.filter((i) => i.id !== id));
		run(() => deleteEvent(id));
	};

	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);

	return (
		<div className="space-y-6">
			<CreateEventForm
				pending={pending}
				onCreate={(fd, reset) => run(() => createEvent(fd).then(() => undefined), reset)}
			/>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			<ul className="space-y-3">
				{items.map((event, i) => (
					<li
						key={event.id}
						{...dragProps(i)}
						className={cn(
							"rounded-(--radius-md) border border-line bg-bg transition-all duration-(--duration-fast)",
							dragging === i && "opacity-50",
							over === i && dragging !== i && "border-accent shadow-sm",
						)}
					>
						<EventItem
							event={event}
							pending={pending}
							onToggleFeatured={() => run(() => setEventFeatured(event.id, !event.featured))}
							onDelete={async () => {
								const ok = await confirm({
									title: `Delete "${event.title}"?`,
									body: "This removes the event and all its photos from the site.",
									confirmLabel: "Delete",
								});
								if (ok) handleDelete(event.id);
							}}
						/>
					</li>
				))}
				{items.length === 0 ? (
					<p className="rounded-(--radius-sm) border border-dashed border-line p-6 text-center text-sm text-muted">
						No events yet. Add one above.
					</p>
				) : null}
			</ul>

			{hasOrderChanges ? (
				<ReorderBar
					label="Event order changed"
					pending={pending}
					saved={saved}
					onSave={handleSaveOrder}
					onReset={() => setItems(baseline)}
				/>
			) : null}
		</div>
	);
}

function CreateEventForm({
	pending,
	onCreate,
}: Readonly<{ pending: boolean; onCreate: (fd: FormData, reset: () => void) => void }>) {
	const [fileCount, setFileCount] = useState(0);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const form = e.currentTarget;
				onCreate(new FormData(form), () => {
					form.reset();
					setFileCount(0);
				});
			}}
			className="rounded-(--radius-md) border border-line bg-bg-soft p-4"
		>
			<p className="mb-3 text-xs font-medium text-muted">Add an event</p>
			<div className="grid gap-3 sm:grid-cols-2">
				<input name="title" placeholder="Title *" required className={adminField} />
				<input
					name="eventDate"
					type="date"
					required
					aria-label="Event date"
					className={adminField}
				/>
				<input
					name="category"
					placeholder="Category (e.g. Exhibition, Workshop)"
					className={`${adminField} sm:col-span-2`}
				/>
				<textarea
					name="description"
					placeholder="Description"
					rows={2}
					className={`${adminField} sm:col-span-2`}
				/>
				<div className="sm:col-span-2">
					<label className="flex cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-dashed border-line px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
						<Plus size={18} />
						<span>
							{fileCount > 0
								? `${fileCount} photo${fileCount === 1 ? "" : "s"} selected`
								: "Choose photos (you can select several)"}
						</span>
						<input
							name="images"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							multiple
							onChange={(e) => setFileCount(e.currentTarget.files?.length ?? 0)}
							className="sr-only"
						/>
					</label>
				</div>
			</div>
			<button type="submit" disabled={pending} className={`${adminBtnPrimary} mt-3`}>
				<Plus size={14} />
				{pending ? "Adding..." : "Add event"}
			</button>
		</form>
	);
}

function EventItem({
	event,
	pending,
	onToggleFeatured,
	onDelete,
}: Readonly<{
	event: Event;
	pending: boolean;
	onToggleFeatured: () => void;
	onDelete: () => void;
}>) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div>
			<div className="flex items-center gap-3 p-3">
				<span className="cursor-grab text-muted active:cursor-grabbing">
					<GripVertical size={16} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{event.title}</p>
					<p className="flex items-center gap-1.5 truncate text-xs text-muted">
						<CalendarDays size={11} />
						{new Date(event.eventDate).toLocaleDateString("en-IN", {
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
						<span aria-hidden="true">·</span>
						{event.images.length} photo{event.images.length === 1 ? "" : "s"}
					</p>
				</div>
				<button
					type="button"
					disabled={pending}
					onClick={onToggleFeatured}
					aria-pressed={event.featured}
					title={event.featured ? "Featured on home" : "Not featured"}
					className={cn(
						"inline-flex h-8 w-8 items-center justify-center rounded-(--radius-sm) border transition-colors disabled:opacity-50",
						event.featured
							? "border-accent text-accent"
							: "border-line text-muted hover:border-accent hover:text-accent",
					)}
				>
					<Star size={14} className={event.featured ? "fill-accent/20" : undefined} />
				</button>
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className={`${adminBtn} px-2 py-1`}
				>
					{expanded ? "Close" : "Edit"}
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

			{expanded ? (
				<div className="space-y-5 border-t border-line p-4">
					<EventMetaEditor event={event} />
					<EventImageManager event={event} />
				</div>
			) : null}
		</div>
	);
}
