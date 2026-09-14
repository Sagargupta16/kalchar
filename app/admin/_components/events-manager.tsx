"use client";

import { CalendarDays, ExternalLink, ImagePlus, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Event } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import {
	adminBtn,
	adminBtnPrimary,
	adminField,
	adminFilePicker,
	adminHelp,
	adminLabel,
	adminPanelInset,
	ICON_LG,
	ICON_MD,
	ICON_SM,
} from "./controls";
import { EventItem } from "./event-item";
import { createEventWithPhotos } from "./event-photo-batch";
import { type EventBatchState, EventPhotoStrip } from "./event-photo-strip";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

// TODO(admin-catalog): read MAX_BATCH / MAX_IMAGE_MB from stage-image.ts once exported.
const PHOTO_BATCH_LIMIT = 12;
const PHOTO_SIZE_LIMIT_MB = 20;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Label for the multi-file photo picker, reflecting how many are selected. */
function photoPickerLabel(count: number): string {
	if (count === 0) return "Choose photos (you can select several)";
	return `${count} photo${count === 1 ? "" : "s"} selected`;
}

/** Local YYYY-MM-DD for the event-date default; the server's parseEventDate accepts it. */
function todayIsoDate(): string {
	return new Date().toLocaleDateString("en-CA");
}

/** The same rules assertUsable and stageFormImages enforce, run before the upload starts. */
function validateSelection(files: readonly File[]): string | null {
	if (files.length > PHOTO_BATCH_LIMIT) {
		return `Choose up to ${PHOTO_BATCH_LIMIT} photos at a time. You picked ${files.length}.`;
	}
	for (const file of files) {
		if (file.size > PHOTO_SIZE_LIMIT_MB * 1024 * 1024) {
			return `"${file.name}" is ${formatBytes(file.size)}. Photos must be ${PHOTO_SIZE_LIMIT_MB} MB or smaller.`;
		}
		if (!PHOTO_TYPES.has(file.type)) {
			return `"${file.name}" must be a JPG, PNG or WebP photo.`;
		}
	}
	return null;
}

function successLine(created: Readonly<{ title: string; photos: number }>): string {
	if (created.photos === 0) return `"${created.title}" added.`;
	return `"${created.title}" added with ${created.photos} photo${created.photos === 1 ? "" : "s"}.`;
}

export function EventsManager({ events: initial }: Readonly<{ events: Event[] }>) {
	const createAction = useAdminAction();
	const { run: undoRun } = useAdminAction();
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(undoRun);
	const reduceMotion = usePrefersReducedMotion();
	const headingId = useId();
	const [creating, setCreating] = useState(false);
	const [created, setCreated] = useState<{ id: string; title: string; photos: number } | null>(
		null,
	);
	const createdRef = useRef<typeof created>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	const [batch, setBatch] = useState<EventBatchState | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [items, setItems] = useServerSyncedList(initial, () => {
		if (createdRef.current) setArrivedId(createdRef.current.id);
	});

	// Scroll the just-created row into view and highlight it while the timer runs (C13).
	useEffect(() => {
		if (!arrivedId) return;
		requestAnimationFrame(() => {
			document
				.getElementById(`event-${arrivedId}`)
				?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [arrivedId, reduceMotion]);

	const categories = [...new Set(items.flatMap((e) => (e.category ? [e.category] : [])))].sort();

	const openPanel = () => {
		setCreated(null);
		createdRef.current = null;
		setCreating(true);
	};

	const handleCreate = (fd: FormData, reset: () => void) => {
		setCreated(null);
		createdRef.current = null;
		setNotice(null);
		const title = String(fd.get("title") ?? "").trim();
		const photos = fd.getAll("images").filter((v) => v instanceof File && v.size > 0).length;
		let createdId: string | null = null;
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
						onPartial: setNotice,
					}).then((result) => {
						if (!isFailure(result)) createdId = result.id;
						return result;
					}),
				() => {
					reset();
					setCreating(false);
					if (createdId) {
						const next = { id: createdId, title, photos };
						setCreated(next);
						createdRef.current = next;
					}
				},
			)
			.finally(() => setBatch(null));
	};

	return (
		<div className="space-y-group">
			{/* Ruling 42: the create area and the list are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<div className="min-w-0 space-y-group">
					{creating ? (
						<CreateEventForm
							pending={createAction.pending}
							pendingVisible={createAction.pendingVisible}
							err={createAction.err}
							batch={batch}
							onCancel={() => setCreating(false)}
							onCreate={handleCreate}
						/>
					) : (
						<button
							type="button"
							onClick={openPanel}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							<Plus size={ICON_MD} aria-hidden="true" />
							Add event
						</button>
					)}
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

				<section aria-labelledby={headingId} className="min-w-0">
					<AdminPanelHeader
						as="h2"
						id={headingId}
						title={`All events (${items.length})`}
						description="Newest first. A pinned event stays at the top whatever its date."
					/>
					<ul aria-labelledby={headingId} className="space-y-tight">
						{items.map((event) => (
							<EventItem
								key={event.id}
								event={event}
								categories={categories}
								defaultExpanded={event.id === created?.id}
								highlighted={event.id === arrivedId}
								onChanged={(next) =>
									setItems((prev) => prev.map((e) => (e.id === next.id ? next : e)))
								}
								onDeleted={(id) => setItems((prev) => prev.filter((e) => e.id !== id))}
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

function CreateEventForm({
	pending,
	pendingVisible,
	err,
	batch,
	onCancel,
	onCreate,
}: Readonly<{
	pending: boolean;
	pendingVisible: boolean;
	err: string | null;
	/** Per-photo upload state rendered by the strip's tiles and counting label while pending. */
	batch: EventBatchState | null;
	onCancel: () => void;
	onCreate: (fd: FormData, reset: () => void) => void;
}>) {
	const headingId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [fileProblem, setFileProblem] = useState<string | null>(null);

	const clearSelection = () => {
		setFiles([]);
		setFileProblem(null);
	};

	const cancel = () => {
		formRef.current?.reset();
		clearSelection();
		onCancel();
	};

	return (
		<form
			ref={formRef}
			aria-labelledby={headingId}
			onSubmit={(e) => {
				e.preventDefault();
				const form = e.currentTarget;
				const fd = new FormData(form);
				// The files state is the FormData source: what the strip shows is what uploads (C9).
				fd.delete("images");
				for (const file of files) fd.append("images", file);
				onCreate(fd, () => {
					form.reset();
					clearSelection();
				});
			}}
			className={adminPanelInset}
		>
			<AdminPanelHeader
				id={headingId}
				title="Add an event"
				description="Photos first, then the details. You can add more photos later."
			/>
			<p className={adminHelp}>Fields marked * are required.</p>
			<div className="mt-4 grid gap-(--form-gap) sm:grid-cols-2">
				<div className="space-y-2 sm:col-span-2">
					<label className={adminFilePicker}>
						<ImagePlus size={ICON_MD} aria-hidden="true" />
						<span>{photoPickerLabel(files.length)}</span>
						<input
							className="sr-only"
							name="images"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							multiple
							disabled={pending}
							onChange={(e) => {
								const next = Array.from(e.currentTarget.files ?? []);
								setFiles(next);
								setFileProblem(validateSelection(next));
							}}
						/>
					</label>
					<p id="new-event-photos-hint" className={adminHelp}>
						JPG, PNG or WebP, up to 20 MB each, up to 12 photos at a time. The first photo is the
						cover.
					</p>
					<EventPhotoStrip files={files} batch={batch} />
					{fileProblem ? <AdminNotice variant="error">{fileProblem}</AdminNotice> : null}
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-event-title">Title *</label>
					<input
						id="new-event-title"
						name="title"
						placeholder="e.g. Monsoon exhibition"
						required
						// biome-ignore lint/a11y/noAutofocus: the panel opens on the user's own tap; focusing the first field is the point (C5)
						autoFocus
						autoCorrect="off"
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-event-date">Event date *</label>
					<input
						id="new-event-date"
						name="eventDate"
						type="date"
						required
						defaultValue={todayIsoDate()}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-event-category">Category (optional)</label>
					<input
						id="new-event-category"
						name="category"
						list="event-categories"
						placeholder="e.g. Exhibition or workshop"
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-event-description">Description (optional)</label>
					<textarea
						id="new-event-description"
						name="description"
						placeholder="A short summary of the gathering"
						rows={3}
						className={adminField}
					/>
				</div>
			</div>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button type="button" disabled={pending} onClick={cancel} className={adminBtn}>
					Cancel
				</button>
				<button
					type="submit"
					disabled={pending || fileProblem !== null}
					aria-busy={pending}
					className={cn(adminBtnPrimary, "w-full sm:w-auto")}
				>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add event
				</button>
			</div>
			{err ? (
				<AdminNotice variant="error" className="mt-4">
					{err}
				</AdminNotice>
			) : null}
		</form>
	);
}
