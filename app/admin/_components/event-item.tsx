"use client";

import { CalendarDays, ChevronDown, Pin, Trash2 } from "lucide-react";
import { useId, useOptimistic, useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import type { Event } from "@/lib/types";
import { cn, formatEventDateShort } from "@/lib/utils";
import { deleteEvent, setEventFeatured } from "../event-actions";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import {
	adminHelp,
	adminIconBtn,
	adminIconBtnDestructive,
	adminRow,
	adminThumb,
	ICON_MD,
} from "./controls";
import { EventImageManager } from "./event-image-manager";
import { EventMetaEditor } from "./event-meta-editor";
import type { UndoOffer } from "./undo-bar";
import { useAdminAction } from "./use-admin-action";

export interface EventItemProps {
	event: Event;
	/** Distinct category values across the list, for the shared <datalist> the manager renders. */
	categories: readonly string[];
	/** The just-created event mounts with its editor open on Details and Photos (C13). */
	defaultExpanded?: boolean;
	/** Accent border on the just-created row; adminRow's transition-ui fades it. */
	highlighted?: boolean;
	onChanged: (next: Event) => void;
	onDeleted: (id: string) => void;
	offerUndo: (offer: UndoOffer) => void;
}

/**
 * The R6 row (D15) for one event: Edit body (cover thumbnail, title, one meta
 * line), the Pin quick state, and Delete at the far end behind a hairline with
 * at least 16px clear space. Two lines on phones, one from a 576px container
 * (@xl/row), the same rule artwork-row.tsx uses. The body expands an inline
 * editor instead of opening a sheet, so it carries aria-expanded and a chevron.
 * Events are not reorderable: their order is date-driven.
 */
export function EventItem({
	event,
	categories,
	defaultExpanded = false,
	highlighted = false,
	onChanged,
	onDeleted,
	offerUndo,
}: Readonly<EventItemProps>) {
	const confirm = useConfirm();
	const editorId = useId();
	const { pending, err, run } = useAdminAction();
	const [expanded, setExpanded] = useState(defaultExpanded);
	// Optimistic Pin (C12): flips the moment run starts, reverts by itself on failure.
	const [featured, setOptimisticFeatured] = useOptimistic(event.featured);

	const togglePin = () =>
		run(
			() => {
				setOptimisticFeatured(!event.featured);
				return setEventFeatured(event.id, !event.featured);
			},
			() => {
				onChanged({ ...event, featured: !event.featured });
				// The raw reverse action, never wrapped in run (the inFlight guard would no-op it).
				offerUndo({
					message: event.featured ? `"${event.title}" unpinned` : `"${event.title}" pinned to top`,
					action: () => setEventFeatured(event.id, event.featured),
				});
			},
		);

	const remove = async () => {
		const ok = await confirm({
			title: `Delete "${event.title}"?`,
			body: "The event and all its photos leave the site.",
			confirmLabel: "Delete event",
			cancelLabel: "Keep event",
		});
		if (ok)
			run(
				() => deleteEvent(event.id),
				() => onDeleted(event.id),
			);
	};

	return (
		<li
			id={`event-${event.id}`}
			className={cn(
				adminRow,
				"@container/row scroll-mt-(--header-h-shrunk)",
				highlighted && "border-accent",
			)}
		>
			<div className="flex flex-col gap-4 @xl/row:flex-row @xl/row:items-center @xl/row:gap-3">
				{/* Line 1: the Edit body */}
				<button
					type="button"
					aria-expanded={expanded}
					aria-controls={editorId}
					aria-label={`Edit ${event.title}`}
					onClick={() => setExpanded((v) => !v)}
					className="flex min-h-control min-w-0 flex-1 items-center gap-3 rounded-(--radius-sm) text-left transition-ui pressable hover:text-accent-text"
				>
					{event.images[0] ? (
						// biome-ignore lint/performance/noImgElement: admin-only thumb from the R2 origin
						<img
							src={`${IMAGE_ORIGIN}/${event.images[0]}-400.webp`}
							alt=""
							className={cn(adminThumb, "size-12")}
						/>
					) : (
						<span className="grid size-12 shrink-0 place-items-center rounded-(--radius-sm) bg-canvas text-muted shadow-hairline">
							<CalendarDays size={ICON_MD} aria-hidden="true" />
						</span>
					)}
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium text-ink">{event.title}</span>
						<span className={cn(adminHelp, "mt-1 block truncate tabular-nums")}>
							{formatEventDateShort(event.eventDate)}
							<span aria-hidden="true"> · </span>
							{event.images.length} photo{event.images.length === 1 ? "" : "s"}
						</span>
						<span className="sr-only">{featured ? ", pinned to top" : ""}</span>
					</span>
					<span
						aria-hidden="true"
						className="grid size-control shrink-0 place-items-center text-muted"
					>
						<ChevronDown size={ICON_MD} className={cn("transition-ui", expanded && "rotate-180")} />
					</span>
				</button>
				{/* Line 2 (phone) / trailing cluster (one-line rows): quick state, then Delete behind the divider */}
				<div className="flex items-center gap-2 @xl/row:shrink-0">
					<button
						type="button"
						disabled={pending}
						onClick={togglePin}
						aria-pressed={featured}
						aria-label={`Pin ${event.title} to top`}
						className={adminIconBtn}
					>
						<Pin
							size={ICON_MD}
							aria-hidden="true"
							className={featured ? "fill-current" : undefined}
						/>
					</button>
					<div className="ml-auto flex items-center border-l border-line pl-4 @xl/row:ml-4">
						<button
							type="button"
							disabled={pending}
							onClick={remove}
							aria-label={`Delete ${event.title}`}
							className={adminIconBtnDestructive}
						>
							<Trash2 size={ICON_MD} aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>
			{expanded ? <EventEditor event={event} categories={categories} editorId={editorId} /> : null}
			{err ? (
				<AdminNotice variant="error" className="mt-3">
					{err}
				</AdminNotice>
			) : null}
		</li>
	);
}

/**
 * The expanded editor under the row: two hairline-separated titled sections in
 * the meta voice. No horizontal padding of its own: the row's p-3 applies, so
 * the content aligns with the thumbnail's left edge and the photo grid gets
 * the full row interior. Pin and Delete stay on the row (D15), so there is no
 * third "Actions" section.
 */
function EventEditor({
	event,
	categories,
	editorId,
}: Readonly<{ event: Event; categories: readonly string[]; editorId: string }>) {
	return (
		<div id={editorId} className="mt-3 divide-y divide-line border-t border-line">
			<section className="space-y-3 py-3" aria-labelledby={`${editorId}-details`}>
				<h3 id={`${editorId}-details`} className="t-meta">
					Details
				</h3>
				<EventMetaEditor event={event} categories={categories} />
			</section>
			<section className="space-y-3 pt-3" aria-labelledby={`${editorId}-photos`}>
				<h3 id={`${editorId}-photos`} className="t-meta">
					Photos
				</h3>
				<EventImageManager event={event} />
			</section>
		</div>
	);
}
