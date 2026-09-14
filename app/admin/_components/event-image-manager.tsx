"use client";

import { ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { progressLabel } from "@/lib/event-photo-batch";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { removeEventImage, reorderEventImages } from "../event-actions";
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
import { addEventPhotos } from "./event-photo-batch";
import { CoverBadge, PhotoStrip } from "./photo-preview";
import { InlineReorderControls } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { UploadProgress, type UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction, usePendingVisible } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

/**
 * Photo manager for one event: figure tiles (the only thing on the image is
 * the Cover pill), a two-line tile footer with the Move pair and a separated
 * Remove, a one-tap "Cover" shortcut, drag on fine pointers, and an "add more"
 * multi-file picker whose upload state never relabels the other controls.
 * Order changes are staged locally and saved on demand through the shared
 * InlineReorderControls, matching the reorder pattern used across the admin.
 */
export function EventImageManager({ event }: Readonly<{ event: Event }>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [baseline, setBaseline] = useState(event.images);
	// Adopt fresh server data after an upload (router.refresh), resetting the
	// reorder baseline to match so new photos appear without a manual reload.
	const [images, setImages] = useServerSyncedList(event.images, setBaseline);
	const [files, setFiles] = useState<File[]>([]);
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	// Uploads carry their own flag so a reorder save or a remove in flight never
	// relabels the Upload button (admin-content-26).
	const [uploading, setUploading] = useState(false);
	// Which control the shared err belongs to: the order pair or the notices slot.
	const [errSlot, setErrSlot] = useState<"order" | "general">("general");
	const uploadSpinning = usePendingVisible(uploading);
	const { dragging, over, dragProps, move } = useReorder(images, setImages, pending);

	const orderChanged =
		images.some((k, i) => k !== baseline[i]) || images.length !== baseline.length;

	const handleSaveOrder = () => {
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderEventImages(event.id, images),
			() => {
				setBaseline(images);
				setSaved(true);
				window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const handleRemove = (keyBase: string) => {
		setErrSlot("general");
		run(
			() => removeEventImage(event.id, keyBase),
			() => {
				setImages((prev) => prev.filter((k) => k !== keyBase));
				setBaseline((prev) => prev.filter((k) => k !== keyBase));
			},
		);
	};

	// "Remove", not "Delete": the master stays in storage for recovery.
	const removeWithConfirm = async (keyBase: string, i: number) => {
		const ok = await confirm({
			title: `Remove photo ${i + 1}?`,
			body:
				i === 0
					? "This is the cover. The next photo becomes the cover."
					: "The photo leaves this event's gallery.",
			confirmLabel: "Remove photo",
			cancelLabel: "Keep photo",
		});
		if (ok) handleRemove(keyBase);
	};

	const handleAdd = (form: HTMLFormElement) => {
		const fd = new FormData(form);
		setErrSlot("general");
		setNotice(null);
		setUploading(true);
		run(
			// Masters go straight to R2, then the server processes one photo per
			// call, so a large batch never overruns the function budget.
			() =>
				addEventPhotos(event.id, fd, {
					onStaging: (fraction) => setProgress({ label: "Uploading photos", fraction }),
					onProgress: (p) => setProgress({ label: progressLabel(p), fraction: p.done / p.total }),
					onPartial: setNotice,
				}),
			() => {
				form.reset();
				setFiles([]);
			},
		).finally(() => {
			setUploading(false);
			setProgress(null);
		});
	};

	return (
		<div className="space-y-3">
			<p className={adminHelp}>
				{images.length} photo{images.length === 1 ? "" : "s"}. The first photo is the cover. Drag a
				photo, or use the arrows under it, to change the order.
			</p>

			{images.length > 0 ? (
				<ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
					{images.map((keyBase, i) => (
						<li
							key={keyBase}
							{...dragProps(i)}
							className={cn(
								"grid gap-2 rounded-(--radius-sm) transition-ui",
								dragging === i && "opacity-60 select-none",
							)}
						>
							{/* Plate: the photo and, on the first tile only, the Cover pill. No control sits on the image. */}
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
									className="h-full w-full object-cover"
								/>
								{i === 0 ? <CoverBadge /> : null}
							</div>
							{/* Footer line 1: the reorder control and the position. */}
							<div className="flex items-center justify-between gap-2">
								<ReorderHandle
									label={`photo ${i + 1}`}
									axis="horizontal"
									index={i}
									count={images.length}
									disabled={pending || uploading}
									onMove={(to) => move(i, to)}
								/>
								<span aria-hidden="true" className={cn(adminHelp, "tabular-nums")}>
									{i + 1} / {images.length}
								</span>
							</div>
							{/* Footer line 2: Make cover at the left, Remove at the far right (never beside the Move pair). */}
							<div className="flex items-center justify-between gap-2">
								{i === 0 ? (
									<span />
								) : (
									<button
										type="button"
										disabled={pending || uploading}
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
									disabled={pending || uploading}
									onClick={() => removeWithConfirm(keyBase, i)}
									aria-label={`Remove photo ${i + 1}`}
									className={adminIconBtnDestructive}
								>
									<Trash2 size={ICON_MD} aria-hidden="true" />
								</button>
							</div>
						</li>
					))}
				</ul>
			) : (
				<EmptyState
					variant="nested"
					voice="tool"
					icon={<ImagePlus size={ICON_LG} aria-hidden="true" />}
					title="No photos yet"
					body="Add photos below; the first becomes the cover."
				/>
			)}

			<div className="flex flex-wrap items-center gap-2">
				{orderChanged ? (
					<InlineReorderControls
						layout="row"
						pending={pending}
						saved={false}
						error={errSlot === "order" ? err : null}
						onSave={handleSaveOrder}
						onReset={() => setImages(baseline)}
					/>
				) : saved ? (
					// The shell's InlineReorderControls keeps its buttons while `saved`, which
					// would leave a dead Save order on screen; only its output line renders here.
					<output className="text-sm text-accent-text">Order saved</output>
				) : null}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleAdd(e.currentTarget);
					}}
					aria-busy={uploading || undefined}
					className="flex items-center gap-2"
				>
					<label className={cn(adminFilePicker, "min-h-control")}>
						<ImagePlus size={ICON_MD} aria-hidden="true" />
						{files.length > 0 ? `${files.length} selected` : "Add photos"}
						<input
							disabled={pending || uploading}
							name="images"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							multiple
							onChange={(e) => setFiles(Array.from(e.currentTarget.files ?? []))}
							className="sr-only"
						/>
					</label>
					{files.length > 0 ? (
						<button
							type="submit"
							disabled={pending || uploading}
							aria-busy={uploading || undefined}
							className={adminBtnPrimary}
						>
							{uploadSpinning ? (
								<LoaderCircle
									size={ICON_MD}
									aria-hidden="true"
									className="motion-safe:animate-spin"
								/>
							) : null}
							Upload photos
						</button>
					) : null}
				</form>
			</div>

			{notice ? <AdminNotice variant="info">{notice}</AdminNotice> : null}
			{err && errSlot === "general" ? <AdminNotice variant="error">{err}</AdminNotice> : null}

			<PhotoStrip files={files} />
			{uploading && progress ? <UploadProgress state={progress} /> : null}
		</div>
	);
}
