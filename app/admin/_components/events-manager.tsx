"use client";

import { CalendarDays, Pin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createEvent, deleteEvent, setEventFeatured } from "../actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";
import { EventImageManager } from "./event-image-manager";
import { EventMetaEditor } from "./event-meta-editor";
import { useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

export function EventsManager({ events: initial }: Readonly<{ events: Event[] }>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	// Adopts new server data after a router.refresh() (e.g. once a create lands)
	// without clobbering optimistic delete/pin updates.
	const [items, setItems] = useServerSyncedList(initial);

	const handleDelete = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		run(() => deleteEvent(id));
	};

	const handleTogglePin = (event: Event) => {
		// Optimistic flip so the badge updates instantly; the route refresh
		// re-sorts pinned-to-top on the server.
		setItems((prev) => prev.map((e) => (e.id === event.id ? { ...e, featured: !e.featured } : e)));
		run(() => setEventFeatured(event.id, !event.featured));
	};

	return (
		<div className="space-y-6">
			<CreateEventForm
				pending={pending}
				onCreate={(fd, reset) => run(() => createEvent(fd).then(() => undefined), reset)}
			/>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}

			<p className="text-xs text-muted">
				Events show newest first. Pin one to keep it at the top regardless of date.
			</p>

			<ul className="space-y-3">
				{items.map((event) => (
					<li
						key={event.id}
						className="rounded-(--radius-md) border border-line bg-bg transition-all duration-(--duration-fast)"
					>
						<EventItem
							event={event}
							pending={pending}
							onTogglePin={() => handleTogglePin(event)}
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
			<button type="submit" disabled={pending} className={`${adminBtnPrimary} mt-4 w-full`}>
				<Plus size={14} />
				{pending ? "Adding..." : "Add event"}
			</button>
		</form>
	);
}

function EventItem({
	event,
	pending,
	onTogglePin,
	onDelete,
}: Readonly<{
	event: Event;
	pending: boolean;
	onTogglePin: () => void;
	onDelete: () => void;
}>) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div>
			<div className="flex items-center gap-3 p-3">
				<div className="min-w-0 flex-1">
					<p className="flex items-center gap-1.5 truncate text-sm font-medium">
						{event.featured ? (
							<Pin size={12} className="shrink-0 fill-accent/20 text-accent" aria-label="Pinned" />
						) : null}
						{event.title}
					</p>
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
					onClick={onTogglePin}
					aria-pressed={event.featured}
					title={event.featured ? "Pinned to top (tap to unpin)" : "Pin to top"}
					className={cn(
						"inline-flex h-8 w-8 items-center justify-center rounded-(--radius-sm) border transition-colors disabled:opacity-50",
						event.featured
							? "border-accent text-accent"
							: "border-line text-muted hover:border-accent hover:text-accent",
					)}
				>
					<Pin size={14} className={event.featured ? "fill-accent/20" : undefined} />
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
