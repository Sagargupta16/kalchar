"use client";

import { ImagePlus, LoaderCircle, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { removeEventImage, reorderEventImages } from "../event-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import {
	adminBtn,
	adminBtnPrimary,
	adminFilePicker,
	adminHelp,
	adminIconBtnDestructive,
	ICON_LG,
	ICON_MD,
} from "./controls";
import { addEventPhotos, EVENT_PHOTO_ACCEPT, validateEventPhotos } from "./event-photo-batch";
import { type EventBatchState, EventCoverChip, EventPhotoStrip } from "./event-photo-strip";
import { InlineReorderControls } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { SAVED_BADGE_DURATION_MS, useAdminAction, usePendingVisible } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

function photoRemovalMessage(count: number, index: number): string {
	if (count === 1) return "The event will have no photos. You can add a new cover later.";
	if (index === 0) return "This is the cover. The next photo becomes the cover.";
	return "The photo leaves this event's gallery.";
}

/**
 * Photo manager for one event: spaced tiles and controls (the only
 * thing on the image is the gold Cover chip), a two-line tile footer with the
 * Move pair and a separated Remove, a one-tap "Cover" shortcut, drag on fine
 * pointers, and a dashed square "Add photos" tile ending the grid. Batches
 * render per-photo progress edges through EventPhotoStrip (N1); order changes
 * are staged locally and saved through the shared InlineReorderControls.
 */
export function EventImageManager({
	event,
	onCoverChange,
	disabled = false,
	onPendingChange,
	onChanged,
}: Readonly<{
	event: Event;
	/** Reports the staged first photo (or null) so the row thumb follows Make cover at once. */
	onCoverChange?: (keyBase: string | null) => void;
	disabled?: boolean;
	onPendingChange?: (pending: boolean) => void;
	onChanged?: (patch: Partial<Event>) => void;
}>) {
	const confirm = useConfirm();
	const formId = useId();
	const photoInputRef = useRef<HTMLInputElement>(null);
	const { pending, err, run } = useAdminAction();
	const [baseline, setBaseline] = useState(event.images);
	// Adopt fresh server data after an upload (router.refresh), resetting the
	// reorder baseline to match so new photos appear without a manual reload.
	const [images, setImages] = useServerSyncedList(event.images, setBaseline);
	const [files, setFiles] = useState<File[]>([]);
	const [batch, setBatch] = useState<EventBatchState | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	// Uploads carry their own flag so a reorder save or a remove in flight never
	// relabels the Upload button (admin-content-26).
	const [uploading, setUploading] = useState(false);
	// Which control the shared err belongs to: the order pair or the notices slot.
	const [errSlot, setErrSlot] = useState<"order" | "general" | null>("general");
	const blocked = pending || uploading || disabled;
	const fileProblem = validateEventPhotos(files);
	const uploadSpinning = usePendingVisible(uploading);
	const { dragging, over, dragProps, move } = useReorder(images, setImages, blocked);

	useEffect(() => {
		onPendingChange?.(pending || uploading);
	}, [pending, uploading, onPendingChange]);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	const stagedCover = images[0] ?? null;
	useEffect(() => {
		onCoverChange?.(stagedCover);
	}, [stagedCover, onCoverChange]);

	const orderChanged =
		images.some((k, i) => k !== baseline[i]) || images.length !== baseline.length;
	useAdminDraftGuard(files.length > 0 || orderChanged || pending || uploading);

	const handleSaveOrder = () => {
		if (blocked || !orderChanged) return;
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderEventImages(event.id, images),
			() => {
				setBaseline(images);
				onChanged?.({ images });
				setSaved(true);
			},
		);
	};

	const handleRemove = (keyBase: string) => {
		if (blocked || orderChanged) return;
		setErrSlot("general");
		run(
			() => removeEventImage(event.id, keyBase),
			() => {
				const next = images.filter((key) => key !== keyBase);
				setImages(next);
				setBaseline(next);
				onChanged?.({ images: next });
				requestAnimationFrame(() => photoInputRef.current?.focus());
			},
		);
	};

	// "Remove", not "Delete": the master stays in storage for recovery.
	const removeWithConfirm = async (keyBase: string, i: number) => {
		if (blocked || orderChanged) return;
		const ok = await confirm({
			title: `Remove photo ${i + 1}?`,
			body: photoRemovalMessage(images.length, i),
			confirmLabel: "Remove photo",
			cancelLabel: "Keep photo",
		});
		if (ok) handleRemove(keyBase);
	};

	const handleAdd = (form: HTMLFormElement) => {
		if (blocked || orderChanged || fileProblem || files.length === 0) return;
		const fd = new FormData(form);
		fd.delete("images");
		for (const file of files) fd.append("images", file);
		setErrSlot("general");
		setNotice(null);
		setUploading(true);
		setBatch({ staging: 0, done: new Set(), total: files.length });
		let addedImages: string[] = [];
		let partialUpload = false;
		run(
			// Masters go straight to R2, then the server processes one photo per
			// call, so a large batch never overruns the function budget.
			() =>
				addEventPhotos(event.id, fd, {
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
					if (!isFailure(result)) addedImages = result.images;
					return result;
				}),
			() => {
				const next = [...images, ...addedImages];
				setImages(next);
				setBaseline(next);
				onChanged?.({ images: next });
				if (!partialUpload) {
					setNotice(`${addedImages.length} photo${addedImages.length === 1 ? "" : "s"} added.`);
				}
				form.reset();
				setFiles([]);
			},
		).finally(() => {
			setUploading(false);
			setBatch(null);
		});
	};

	const updateFiles = (next: File[]) => {
		setFiles(next);
		setNotice(null);
		setErrSlot(null);
		if (photoInputRef.current) photoInputRef.current.value = "";
		if (next.length === 0) photoInputRef.current?.focus();
	};

	return (
		<div className="@container/photos space-y-3">
			<p className={adminHelp}>
				{images.length} photo{images.length === 1 ? "" : "s"}. The first photo is the cover. Drag a
				photo, or use the arrows under it, to change the order. Choose Save order to publish
				changes, including a new cover.
			</p>

			{images.length === 0 ? (
				<EmptyState
					variant="nested"
					voice="tool"
					icon={<ImagePlus size={ICON_LG} aria-hidden="true" />}
					title="No photos yet"
					body="Add photos below; the first becomes the cover."
				/>
			) : null}

			<ul className="grid grid-cols-2 gap-(--space-tight) @2xl/photos:grid-cols-3">
				{images.map((keyBase, i) => (
					<li
						key={keyBase}
						{...dragProps(i)}
						className={cn(
							"grid gap-2 rounded-(--radius-sm) transition-ui",
							dragging === i && "opacity-60 select-none",
						)}
					>
						{/* Plate: the photo and, on the first tile only, the gold Cover chip. No control sits on the image. */}
						<div
							className={cn(
								"relative aspect-square overflow-hidden rounded-(--radius-sm) border bg-canvas transition-ui",
								over === i && dragging !== i ? "border-accent shadow-e1" : "border-line",
							)}
						>
							{/* biome-ignore lint/performance/noImgElement: admin-only thumb, R2 origin */}
							<img
								src={`${IMAGE_ORIGIN}/${keyBase}-400.webp`}
								alt={i === 0 ? "Cover" : `Photo ${i + 1}`}
								className="h-full w-full object-cover transition-opacity duration-(--duration-fast) starting:opacity-0"
							/>
							{i === 0 ? <EventCoverChip /> : null}
						</div>
						{/* Footer line 1: the reorder control and the position. */}
						<div className="flex flex-wrap items-center justify-between gap-2">
							<ReorderHandle
								label={`photo ${i + 1}`}
								axis="horizontal"
								index={i}
								count={images.length}
								disabled={blocked}
								onMove={(to) => move(i, to)}
							/>
							<span aria-hidden="true" className={cn(adminHelp, "tabular-nums")}>
								{i + 1} / {images.length}
							</span>
						</div>
						{/* Footer line 2: Make cover at the left, Remove at the far right (never beside the Move pair). */}
						<div className="flex flex-wrap items-center justify-between gap-2">
							{i === 0 ? (
								<span />
							) : (
								<button
									type="button"
									disabled={blocked}
									onClick={() => move(i, 0)}
									aria-label={`Make photo ${i + 1} the cover`}
									className={adminBtn}
								>
									<Star size={ICON_MD} aria-hidden="true" />
									Cover
								</button>
							)}
							<button
								type="button"
								disabled={blocked || orderChanged}
								aria-describedby={orderChanged ? `${formId}-order-hint` : undefined}
								onClick={() => removeWithConfirm(keyBase, i)}
								aria-label={`Remove photo ${i + 1}`}
								className={adminIconBtnDestructive}
							>
								<Trash2 size={ICON_MD} aria-hidden="true" />
							</button>
						</div>
					</li>
				))}
				{/* The dashed square Add-photos tile ends the grid; its input submits through the toolbar form. */}
				<li>
					<label
						className={cn(
							adminFilePicker,
							"aspect-square w-full flex-col items-center justify-center gap-2 p-3 text-center",
						)}
					>
						<Plus size={ICON_LG} aria-hidden="true" />
						<span>{files.length > 0 ? `${files.length} selected` : "Add photos"}</span>
						<input
							ref={photoInputRef}
							form={formId}
							disabled={blocked}
							name="images"
							type="file"
							accept={EVENT_PHOTO_ACCEPT}
							multiple
							aria-invalid={fileProblem ? true : undefined}
							aria-describedby={
								fileProblem
									? `${formId}-photos-hint ${formId}-photos-error`
									: `${formId}-photos-hint`
							}
							onChange={(e) => {
								const next = Array.from(e.currentTarget.files ?? []);
								if (next.length > 0) {
									setFiles(next);
									setNotice(null);
									setErrSlot(null);
								}
							}}
							className="sr-only"
						/>
					</label>
				</li>
			</ul>
			<p id={`${formId}-photos-hint`} className={adminHelp}>
				JPG, PNG or WebP, up to 20 MB each. Choose up to 12 photos, then select Upload photos.
			</p>
			{fileProblem ? (
				<AdminNotice id={`${formId}-photos-error`} variant="error">
					{fileProblem}
				</AdminNotice>
			) : null}
			{orderChanged ? (
				<p id={`${formId}-order-hint`} className={adminHelp}>
					Save or reset the photo order before uploading or removing photos.
				</p>
			) : null}

			<EventPhotoActions
				formId={formId}
				blocked={blocked}
				uploading={uploading}
				uploadSpinning={uploadSpinning}
				orderChanged={orderChanged}
				saved={saved}
				orderError={errSlot === "order" ? err : null}
				hasFiles={files.length > 0}
				hasFileProblem={fileProblem !== null}
				onSaveOrder={handleSaveOrder}
				onResetOrder={() => {
					setImages(baseline);
					setSaved(false);
					setErrSlot(null);
				}}
				onAdd={handleAdd}
			/>

			{notice ? <AdminNotice variant="info">{notice}</AdminNotice> : null}
			{err && errSlot === "general" ? <AdminNotice variant="error">{err}</AdminNotice> : null}

			<EventPhotoStrip
				files={files}
				batch={batch}
				showCover={images.length === 0}
				disabled={blocked}
				onFilesChange={updateFiles}
			/>
		</div>
	);
}

function EventPhotoActions({
	formId,
	blocked,
	uploading,
	uploadSpinning,
	orderChanged,
	saved,
	orderError,
	hasFiles,
	hasFileProblem,
	onSaveOrder,
	onResetOrder,
	onAdd,
}: Readonly<{
	formId: string;
	blocked: boolean;
	uploading: boolean;
	uploadSpinning: boolean;
	orderChanged: boolean;
	saved: boolean;
	orderError: string | null;
	hasFiles: boolean;
	hasFileProblem: boolean;
	onSaveOrder: () => void;
	onResetOrder: () => void;
	onAdd: (form: HTMLFormElement) => void;
}>) {
	// Keep the saved notice without showing inactive order controls.
	const savedOrderNotice = saved ? (
		<output className="text-sm text-accent-text">Order saved</output>
	) : null;
	return (
		<div className="flex flex-wrap items-center gap-2">
			{orderChanged ? (
				<InlineReorderControls
					layout="row"
					pending={blocked}
					saved={false}
					error={orderError}
					onSave={onSaveOrder}
					onReset={onResetOrder}
				/>
			) : (
				savedOrderNotice
			)}
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					onAdd(event.currentTarget);
				}}
				aria-busy={uploading || undefined}
				className="flex items-center gap-2"
			>
				{hasFiles ? (
					<button
						type="submit"
						disabled={blocked || orderChanged || hasFileProblem}
						aria-busy={uploading || undefined}
						aria-describedby={orderChanged ? `${formId}-order-hint` : undefined}
						className={adminBtnPrimary}
					>
						{uploadSpinning ? (
							<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
						) : null}
						Upload photos
					</button>
				) : null}
			</form>
		</div>
	);
}
