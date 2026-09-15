"use client";

import { CalendarDays, ExternalLink, ImagePlus, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEventPhotoDraft, useGlobalEventFiles } from "./add-sheet";
import { useAdminDraftGuard } from "./admin-draft-guard";
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
import {
	createEventWithPhotos,
	EVENT_PHOTO_ACCEPT,
	validateEventPhotos,
} from "./event-photo-batch";
import { type EventBatchState, EventPhotoStrip } from "./event-photo-strip";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

/** Label for the multi-file photo picker, reflecting how many are selected. */
function photoPickerLabel(count: number): string {
	if (count === 0) return "Choose photos (you can select several)";
	return `${count} photo${count === 1 ? "" : "s"} selected`;
}

/** Local YYYY-MM-DD for the event-date default; the server's parseEventDate accepts it. */
function todayIsoDate(): string {
	return new Date().toLocaleDateString("en-CA");
}

function successLine(created: Readonly<{ title: string; photos: number | null }>): string {
	if (!created.photos) return `"${created.title}" added.`;
	return `"${created.title}" added with ${created.photos} photo${created.photos === 1 ? "" : "s"}.`;
}

export function EventsManager({ events: initial }: Readonly<{ events: Event[] }>) {
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

	const categories = [...new Set(items.flatMap((e) => (e.category ? [e.category] : [])))].sort();
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
		const title = String(fd.get("title") ?? "").trim();
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
							onCancel={closePanel}
							onCreate={handleCreate}
						/>
					) : (
						<button
							ref={addButtonRef}
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

				<section ref={listRef} tabIndex={-1} aria-labelledby={headingId} className="min-w-0">
					<AdminPanelHeader
						as="h2"
						id={headingId}
						title={`All events (${items.length})`}
						description="Newest first. A pinned event stays at the top whatever its date."
					/>
					<ul aria-labelledby={headingId} className="space-y-tight">
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
	const photoInputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useEventPhotoDraft(pending);
	const [titleProblem, setTitleProblem] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [initialDate] = useState(todayIsoDate);
	const [textDirty, setTextDirty] = useState(false);
	const fileProblem = validateEventPhotos(files);
	useAdminDraftGuard(textDirty || files.length > 0 || pending);

	const clearSelection = () => {
		setFiles([]);
	};

	const updateFiles = (next: File[]) => {
		setFiles(next);
		if (photoInputRef.current) photoInputRef.current.value = "";
		if (next.length === 0) photoInputRef.current?.focus();
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
			onChange={(e) => {
				const fields = new FormData(e.currentTarget);
				setTextDirty(
					["title", "category", "description"].some(
						(name) => String(fields.get(name) ?? "") !== "",
					) || fields.get("eventDate") !== initialDate,
				);
			}}
			onSubmit={(e) => {
				e.preventDefault();
				if (pending || fileProblem) return;
				const form = e.currentTarget;
				const fd = new FormData(form);
				const title = String(fd.get("title") ?? "").trim();
				if (!title) {
					setTitleProblem("Enter a title.");
					(form.elements.namedItem("title") as HTMLInputElement | null)?.focus();
					return;
				}
				fd.set("title", title);
				// The files state is the FormData source: what the strip shows is what uploads (C9).
				fd.delete("images");
				for (const file of files) fd.append("images", file);
				setSubmitted(true);
				onCreate(fd, () => {
					form.reset();
					clearSelection();
				});
			}}
			className={cn(adminPanelInset, "@container/create")}
		>
			<AdminPanelHeader
				id={headingId}
				title="Add an event"
				description="Photos first, then the details. You can add more photos later."
			/>
			<p className={adminHelp}>Fields marked * are required.</p>
			<fieldset
				disabled={pending}
				className="mt-(--form-gap) grid min-w-0 gap-(--form-gap) @lg/create:grid-cols-2"
			>
				<div className="space-y-2 @lg/create:col-span-2">
					<label className={adminFilePicker}>
						<ImagePlus size={ICON_MD} aria-hidden="true" />
						<span>{photoPickerLabel(files.length)}</span>
						<input
							ref={photoInputRef}
							className="sr-only"
							name="images"
							type="file"
							accept={EVENT_PHOTO_ACCEPT}
							multiple
							disabled={pending}
							aria-invalid={fileProblem ? true : undefined}
							aria-describedby={
								fileProblem
									? "new-event-photos-hint new-event-photos-error"
									: "new-event-photos-hint"
							}
							onChange={(e) => {
								const next = Array.from(e.currentTarget.files ?? []);
								if (next.length > 0) setFiles(next);
							}}
						/>
					</label>
					<p id="new-event-photos-hint" className={adminHelp}>
						JPG, PNG or WebP, up to 20 MB each, up to 12 photos at a time. The first photo is the
						cover.
					</p>
					<EventPhotoStrip
						files={files}
						batch={batch}
						disabled={pending}
						onFilesChange={updateFiles}
					/>
					{fileProblem ? (
						<AdminNotice id="new-event-photos-error" variant="error">
							{fileProblem}
						</AdminNotice>
					) : null}
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-event-title">Title *</label>
					<input
						id="new-event-title"
						name="title"
						placeholder="e.g. Monsoon exhibition"
						required
						aria-invalid={titleProblem ? true : undefined}
						aria-describedby={titleProblem ? "new-event-title-error" : undefined}
						onInvalid={() => setTitleProblem("Enter a title.")}
						onChange={() => setTitleProblem(null)}
						// biome-ignore lint/a11y/noAutofocus: the panel opens on the user's own tap; focusing the first field is the point (C5)
						autoFocus
						autoCorrect="off"
						className={adminField}
					/>
					{titleProblem ? (
						<AdminNotice id="new-event-title-error" variant="error">
							{titleProblem}
						</AdminNotice>
					) : null}
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-event-date">Event date *</label>
					<input
						id="new-event-date"
						name="eventDate"
						type="date"
						required
						defaultValue={initialDate}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "@lg/create:col-span-2")}>
					<label htmlFor="new-event-category">Category (optional)</label>
					<input
						id="new-event-category"
						name="category"
						list="event-categories"
						placeholder="e.g. Exhibition or workshop"
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "@lg/create:col-span-2")}>
					<label htmlFor="new-event-description">Description (optional)</label>
					<textarea
						id="new-event-description"
						name="description"
						placeholder="A short summary of the gathering"
						rows={3}
						className={adminField}
					/>
				</div>
			</fieldset>
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
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add event
				</button>
			</div>
			{submitted && err ? (
				<AdminNotice variant="error" className="mt-(--form-gap)">
					{err}
				</AdminNotice>
			) : null}
		</form>
	);
}
