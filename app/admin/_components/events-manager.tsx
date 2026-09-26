"use client";

import { CalendarDays, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import { formString } from "@/lib/admin-helpers";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGlobalEventFiles } from "./add-sheet";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { adminBtn, ICON_LG, ICON_MD, ICON_SM } from "./controls";
import { CreateEventForm } from "./event-create-form";
import { EventItem } from "./event-item";
import { createEventWithPhotos } from "./event-photo-batch";
import type { EventBatchState } from "./event-photo-strip";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useEntranceStagger } from "./use-entrance-stagger";
import { useServerSyncedList } from "./use-server-synced-list";

function successLine(created: Readonly<{ title: string; photos: number | null }>): string {
	if (!created.photos) return `"${created.title}" added.`;
	return `"${created.title}" added with ${created.photos} photo${created.photos === 1 ? "" : "s"}.`;
}

export function EventsManager({ events: initial }: Readonly<{ events: Event[] }>) {
	const stagger = useEntranceStagger();
	const createAction = useAdminAction();
	const globalEventFiles = useGlobalEventFiles();
	const { run: undoRun } = useAdminAction();
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(undoRun);
	const headingId = useId();
	const addButtonRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLElement>(null);
	const [creating, setCreating] = useState(false);
	const [created, setCreated] = useState<{
		id: string;
		title: string;
		photos: number | null;
	} | null>(null);
	const createdRef = useRef<typeof created>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	const [batch, setBatch] = useState<EventBatchState | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [items, setItems] = useServerSyncedList(initial);

	useEffect(() => {
		if (!globalEventFiles || createAction.pending) return;
		setCreating(true);
		setCreated(null);
		setNotice(null);
		createdRef.current = null;
	}, [globalEventFiles, createAction.pending]);

	useEffect(() => {
		const createdId = created?.id;
		if (
			createdId &&
			createdRef.current?.id === createdId &&
			items.some((event) => event.id === createdId)
		) {
			setArrivedId(createdId);
			createdRef.current = null;
		}
	}, [created, items]);

	// Scroll the just-created row into view and highlight it while the timer runs (C13).
	useEffect(() => {
		if (!arrivedId) return;
		const frame = requestAnimationFrame(() => {
			const row = document.getElementById(`event-${arrivedId}`);
			row?.querySelector("button")?.focus({ preventScroll: true });
			row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, [arrivedId]);

	const categories = [...new Set(items.flatMap((e) => (e.category ? [e.category] : [])))].sort(
		(a, b) => a.localeCompare(b),
	);
	const orderedItems = [...items].sort(
		(a, b) =>
			Number(b.featured) - Number(a.featured) ||
			Date.parse(b.eventDate) - Date.parse(a.eventDate) ||
			a.order - b.order ||
			a.id.localeCompare(b.id),
	);

	const openPanel = () => {
		setCreated(null);
		setNotice(null);
		createdRef.current = null;
		setCreating(true);
	};

	const closePanel = () => {
		setCreating(false);
		requestAnimationFrame(() => addButtonRef.current?.focus());
	};

	const handleCreate = (fd: FormData, reset: () => void) => {
		setCreated(null);
		createdRef.current = null;
		setNotice(null);
		const title = formString(fd, "title").trim();
		const photos = fd.getAll("images").filter((v) => v instanceof File && v.size > 0).length;
		let createdId: string | null = null;
		let partialUpload = false;
		setBatch({ staging: 0, done: new Set(), total: photos });
		createAction
			.run(
				// Masters go straight to R2, then the server processes one photo per
				// call, so a large batch never overruns the function budget.
				() =>
					createEventWithPhotos(fd, {
						onStaging: (fraction) => setBatch((b) => (b ? { ...b, staging: fraction } : b)),
						onPhotoDone: (index) =>
							setBatch((b) => {
								if (!b) return b;
								const done = new Set(b.done);
								done.add(index);
								return { ...b, done };
							}),
						onPartial: (message) => {
							partialUpload = true;
							setNotice(message);
						},
					}).then((result) => {
						if (!isFailure(result)) createdId = result.id;
						return result;
					}),
				() => {
					reset();
					closePanel();
					if (createdId) {
						const next = { id: createdId, title, photos: partialUpload ? null : photos };
						setCreated(next);
						createdRef.current = next;
					}
				},
			)
			.finally(() => setBatch(null));
	};

	const sideColumn = creating || created !== null || notice !== null;

	return (
		<div className="space-y-group">
			{/* Ruling 42: the create area and the list are independent panels, side by side from
			    lg. The side column exists only while it has content (the form or a notice); at
			    rest the list takes the full width and Add sits in its header. */}
			<div
				className={cn(
					"grid gap-(--space-group) lg:items-start",
					sideColumn && "lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]",
				)}
			>
				<div className={cn("min-w-0 space-y-group", !sideColumn && "hidden")}>
					{creating ? (
						<CreateEventForm
							pending={createAction.pending}
							pendingVisible={createAction.pendingVisible}
							err={createAction.err}
							batch={batch}
							onCancel={closePanel}
							onCreate={handleCreate}
						/>
					) : null}
					{created ? (
						<AdminNotice variant="success">
							<span className="min-w-0">
								{successLine(created)}{" "}
								<Link
									href="/events"
									className="underline underline-offset-2 hover:text-accent-text"
								>
									View on site
									<ExternalLink
										size={ICON_SM}
										aria-hidden="true"
										className="ml-1 inline-block align-[-2px]"
									/>
								</Link>
							</span>
						</AdminNotice>
					) : null}
					{notice ? (
						<AdminNotice variant="info">
							{notice} The event is open below; use Add photos there.
						</AdminNotice>
					) : null}
				</div>

				<section ref={listRef} tabIndex={-1} aria-labelledby={headingId} className="min-w-0">
					<AdminPanelHeader
						as="h2"
						id={headingId}
						title={`All events (${items.length})`}
						description="Newest first. A pinned event stays at the top whatever its date."
						action={
							creating ? null : (
								<button ref={addButtonRef} type="button" onClick={openPanel} className={adminBtn}>
									<Plus size={ICON_MD} aria-hidden="true" />
									Add event
								</button>
							)
						}
					/>
					<ul aria-labelledby={headingId} className={cn("space-y-tight", stagger)}>
						{orderedItems.map((event) => (
							<EventItem
								key={event.id}
								event={event}
								categories={categories}
								defaultExpanded={event.id === created?.id}
								highlighted={event.id === arrivedId}
								onChanged={(patch) =>
									setItems((prev) =>
										prev.map((item) => (item.id === event.id ? { ...item, ...patch } : item)),
									)
								}
								onDeleted={(id) => {
									setItems((prev) => prev.filter((e) => e.id !== id));
									requestAnimationFrame(() => listRef.current?.focus());
								}}
								offerUndo={offerUndo}
							/>
						))}
						{items.length === 0 ? (
							<EmptyState
								as="li"
								variant="compact"
								voice="tool"
								icon={<CalendarDays size={ICON_LG} aria-hidden="true" />}
								title="No events yet"
								body="Add the first one with its photos and it appears on the public events page."
								action={
									creating ? null : (
										<button type="button" onClick={openPanel} className={adminBtn}>
											Add event
										</button>
									)
								}
							/>
						) : null}
					</ul>
				</section>
			</div>

			{undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError}
					onAction={undoNow}
					onDismiss={dismissUndo}
				/>
			) : null}

			<datalist id="event-categories">
				{categories.map((c) => (
					<option key={c} value={c} />
				))}
			</datalist>
		</div>
	);
}
