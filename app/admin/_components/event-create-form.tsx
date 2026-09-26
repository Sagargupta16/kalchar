"use client";

import { ImagePlus, LoaderCircle, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { formString } from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";
import { useEventPhotoDraft } from "./add-sheet";
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
	ICON_MD,
} from "./controls";
import { EVENT_PHOTO_ACCEPT, validateEventPhotos } from "./event-photo-batch";
import { type EventBatchState, EventPhotoStrip } from "./event-photo-strip";
import { useEditorFocus } from "./use-editor-focus";

/** Label for the multi-file photo picker, reflecting how many are selected. */
function photoPickerLabel(count: number): string {
	if (count === 0) return "Choose photos (you can select several)";
	return `${count} photo${count === 1 ? "" : "s"} selected`;
}

/** Local YYYY-MM-DD for the event-date default; the server's parseEventDate accepts it. */
function todayIsoDate(): string {
	return new Date().toLocaleDateString("en-CA");
}

/**
 * The create-event panel (split from events-manager.tsx at the 500-line
 * ceiling): photos first, then title, date, category and description. The
 * manager owns the batch upload and the success notice.
 */
export function CreateEventForm({
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
	const titleRef = useEditorFocus<HTMLInputElement>();
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
					["title", "category", "description"].some((name) => formString(fields, name) !== "") ||
						fields.get("eventDate") !== initialDate,
				);
			}}
			onSubmit={(e) => {
				e.preventDefault();
				if (pending || fileProblem) return;
				const form = e.currentTarget;
				const fd = new FormData(form);
				const title = formString(fd, "title").trim();
				if (!title) {
					setTitleProblem("Enter a title.");
					titleRef.current?.focus();
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
						ref={titleRef}
						id="new-event-title"
						name="title"
						placeholder="e.g. Monsoon exhibition"
						required
						aria-invalid={titleProblem ? true : undefined}
						aria-describedby={titleProblem ? "new-event-title-error" : undefined}
						onInvalid={() => setTitleProblem("Enter a title.")}
						onChange={() => setTitleProblem(null)}
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
