"use client";

import { Check, ImagePlus, Replace, RotateCcw, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { SPRING_PANEL } from "@/lib/motion";
import { cn, formatBytes } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminBtnPrimary, adminHelp, ICON_MD } from "./controls";
import { useObjectUrl } from "./photo-preview";
import { UploadProgress } from "./upload-progress";
import type { UploadComposerState } from "./use-upload-composer";

export function UploadPhotoStep({ composer }: Readonly<{ composer: UploadComposerState }>) {
	const { file, step, added, pending, progress, stagedKey, stageError, adopt, retry } = composer;
	const url = useObjectUrl(file);
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [dropError, setDropError] = useState<string | null>(null);
	const compact = step !== "photo";
	return (
		<section
			aria-label="Artwork photo"
			className="min-w-0 lg:sticky lg:top-0"
			onDragOver={(event) => {
				event.preventDefault();
				if (!pending && !added) setDragging(true);
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDragging(false);
				if (pending || added) return;
				if (event.dataTransfer.files.length !== 1) {
					setDropError("Choose one photo for this piece.");
					return;
				}
				setDropError(null);
				adopt(event.dataTransfer.files[0]!);
			}}
		>
			<div
				className={cn(
					"relative overflow-hidden rounded-md border bg-canvas p-3 shadow-e1 transition-ui sm:p-4",
					dragging ? "border-accent bg-accent-soft" : "border-line",
				)}
			>
				{file ? (
					<div
						className={cn(
							"grid place-items-center",
							compact
								? "h-36 lg:h-[min(52svh,32rem)]"
								: "h-[min(42svh,24rem)] lg:h-[min(52svh,32rem)]",
						)}
					>
						{url ? (
							// biome-ignore lint/performance/noImgElement: local object URL, never a remote image request
							<motion.img
								key={url}
								src={url}
								alt="Preview of the selected artwork"
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={SPRING_PANEL}
								className="max-h-full max-w-full rounded-md object-contain shadow-e2"
							/>
						) : null}
					</div>
				) : (
					<button
						type="button"
						onClick={() => input.current?.click()}
						className="grid min-h-64 w-full content-center justify-items-center gap-4 rounded-md border border-dashed border-line-strong px-4 py-8 text-center transition-ui hover:border-accent hover:bg-surface lg:min-h-[min(52svh,32rem)]"
					>
						<span className="grid size-16 place-items-center rounded-md bg-surface text-accent-text shadow-e1">
							<ImagePlus size={32} aria-hidden="true" />
						</span>
						<span className="text-xl font-medium text-ink">Choose a photo</span>
						<span className={adminHelp}>JPG, PNG, or WebP up to 20 MB</span>
						<span className="hidden text-label text-muted pointer-fine:block">
							Or drop a photo here
						</span>
					</button>
				)}
				{dragging ? (
					<div className="pointer-events-none absolute inset-0 grid place-items-center rounded-md border-2 border-accent bg-surface-raised/95 text-lg font-medium text-accent-text">
						Drop your photo here
					</div>
				) : null}
				<input
					ref={input}
					name="image"
					type="file"
					hidden
					accept="image/jpeg,image/png,image/webp"
					aria-label={file ? "Change photo" : "Choose a photo"}
					disabled={pending || !!added}
					tabIndex={-1}
					onChange={(event) => {
						const chosen = event.currentTarget.files?.[0];
						if (chosen) {
							setDropError(null);
							adopt(chosen);
						}
						event.currentTarget.value = "";
					}}
				/>
			</div>
			{file ? (
				<div className="mt-3 grid gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-medium text-ink">{file.name}</span>
							<span className={adminHelp}>{formatBytes(file.size)} · Full photo, no cropping</span>
						</span>
						{!added ? (
							<button
								type="button"
								disabled={pending}
								onClick={() => input.current?.click()}
								className={adminBtn}
							>
								<Replace size={ICON_MD} aria-hidden="true" />
								Change photo
							</button>
						) : null}
					</div>
					{stageError ? (
						<div className="grid gap-2">
							<AdminNotice variant="error">{stageError}</AdminNotice>
							<button
								type="button"
								onClick={retry}
								className={cn(adminBtnPrimary, "justify-self-start")}
							>
								<RotateCcw size={ICON_MD} aria-hidden="true" /> Retry upload
							</button>
						</div>
					) : progress ? (
						<div className="rounded-md border border-line bg-surface p-3">
							<div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
								{stagedKey && !pending ? (
									<Check size={ICON_MD} aria-hidden="true" />
								) : (
									<Upload size={ICON_MD} aria-hidden="true" />
								)}
								{pending ? "Publishing" : stagedKey ? "Photo ready" : "Uploading in the background"}
							</div>
							<UploadProgress state={progress} />
						</div>
					) : null}
				</div>
			) : null}
			{dropError ? (
				<AdminNotice variant="error" className="mt-3">
					{dropError}
				</AdminNotice>
			) : null}
		</section>
	);
}
