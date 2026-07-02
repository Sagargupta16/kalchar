"use client";

import { GripVertical, ImagePlus, Save, X } from "lucide-react";
import { useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addEventImages, removeEventImage, reorderEventImages } from "../event-actions";
import { adminBtn, adminBtnPrimary } from "./controls";
import { useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";

/**
 * Photo manager for one event: a draggable thumbnail grid (reorder), per-photo
 * remove, and an "add more" multi-file picker. Order changes are staged locally
 * and saved on demand (one server round-trip), matching the reorder pattern
 * used elsewhere in the admin.
 */
export function EventImageManager({ event }: Readonly<{ event: Event }>) {
	const { pending, err, run } = useAdminAction();
	const [images, setImages] = useState(event.images);
	const [baseline, setBaseline] = useState(event.images);
	const [fileCount, setFileCount] = useState(0);
	const { dragging, over, dragProps } = useReorder(images, setImages);

	const orderChanged =
		images.some((k, i) => k !== baseline[i]) || images.length !== baseline.length;

	const handleSaveOrder = () =>
		run(
			() => reorderEventImages(event.id, images),
			() => setBaseline(images),
		);

	const handleRemove = (keyBase: string) => {
		setImages((prev) => prev.filter((k) => k !== keyBase));
		setBaseline((prev) => prev.filter((k) => k !== keyBase));
		run(() => removeEventImage(event.id, keyBase));
	};

	const handleAdd = (form: HTMLFormElement) => {
		const fd = new FormData(form);
		run(
			() => addEventImages(event.id, fd),
			() => {
				form.reset();
				setFileCount(0);
			},
		);
	};

	return (
		<div className="space-y-3">
			<p className="text-xs font-medium text-muted">
				Photos ({images.length}) — drag to reorder, the first is the cover
			</p>

			{images.length > 0 ? (
				<ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
					{images.map((keyBase, i) => (
						<li
							key={keyBase}
							{...dragProps(i)}
							className={cn(
								"group relative aspect-square overflow-hidden rounded-(--radius-sm) border bg-bg-soft transition-all duration-(--duration-fast)",
								dragging === i ? "opacity-50" : "border-line",
								over === i && dragging !== i && "border-accent shadow-e1",
							)}
						>
							{/* biome-ignore lint/performance/noImgElement: admin-only thumb, R2 origin, next/image not configured for this host */}
							<img
								src={`${IMAGE_ORIGIN}/${keyBase}-400.webp`}
								alt={i === 0 ? "Cover" : `Position ${i + 1}`}
								className="h-full w-full object-cover"
							/>
							{i === 0 ? (
								<span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-[var(--tracking-meta)] text-bg">
									Cover
								</span>
							) : null}
							<span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-bg">
								<GripVertical size={11} />
							</span>
							<button
								type="button"
								disabled={pending}
								onClick={() => handleRemove(keyBase)}
								aria-label={`Remove photo ${i + 1}`}
								className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ruby text-bg opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
							>
								<X size={12} />
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="rounded-(--radius-sm) border border-dashed border-line p-4 text-center text-xs text-muted">
					No photos yet. Add some below.
				</p>
			)}

			<div className="flex flex-wrap items-center gap-2.5">
				{orderChanged ? (
					<button
						type="button"
						disabled={pending}
						onClick={handleSaveOrder}
						className={`${adminBtnPrimary} px-3 py-1.5`}
					>
						<Save size={14} />
						Save photo order
					</button>
				) : null}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleAdd(e.currentTarget);
					}}
					className="flex items-center gap-2"
				>
					<label className={`${adminBtn} cursor-pointer px-3 py-1.5`}>
						<ImagePlus size={14} />
						{fileCount > 0 ? `${fileCount} selected` : "Add photos"}
						<input
							name="images"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							multiple
							onChange={(e) => setFileCount(e.currentTarget.files?.length ?? 0)}
							className="sr-only"
						/>
					</label>
					{fileCount > 0 ? (
						<button type="submit" disabled={pending} className={`${adminBtnPrimary} px-3 py-1.5`}>
							{pending ? "Uploading..." : "Upload"}
						</button>
					) : null}
				</form>
			</div>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}
		</div>
	);
}
