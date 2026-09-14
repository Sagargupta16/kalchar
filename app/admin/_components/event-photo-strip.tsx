"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Live state for one photo batch (visual-direction-admin Tier 2b, N1): the
 * aggregate share of bytes sent to R2 plus which selection indexes have
 * finished server-side processing, so every tile can carry its own honest
 * progress edge and one label can count the batch.
 */
export interface EventBatchState {
	/** Share of bytes sent to R2 across the whole selection (0 to 1, real XHR bytes). */
	staging: number;
	/** Selection indexes whose processing finished (success or failure). */
	done: ReadonlySet<number>;
	total: number;
}

/** The gold Cover chip: gold marks Featured and Cover only (visual-direction-admin 1.9, Tier 2b). */
export function EventCoverChip({ className }: Readonly<{ className?: string }>) {
	return (
		<Badge
			variant="accent"
			className={cn("absolute top-1 left-1 z-raised bg-gold-leaf text-ink", className)}
		>
			Cover
		</Badge>
	);
}

/**
 * Object URLs for the selected files, created in an effect and revoked in its
 * cleanup, so StrictMode's mount, cleanup, mount cycle cannot revoke a URL an
 * <img> is still loading. Callers must pass a stable array (state), not a literal.
 */
function useObjectUrls(files: readonly File[]): string[] {
	const [urls, setUrls] = useState<string[]>([]);
	useEffect(() => {
		const next = files.map((file) => URL.createObjectURL(file));
		setUrls(next);
		return () => {
			for (const url of next) URL.revokeObjectURL(url);
		};
	}, [files]);
	return urls;
}

/** One tile's bottom progress edge: real bytes while staging, the honest skeleton sweep while its photo processes, full when done. */
function TileEdge({ batch, index }: Readonly<{ batch: EventBatchState; index: number }>) {
	const finished = batch.done.has(index);
	const processing = batch.staging >= 1 && !finished;
	const fraction = finished ? 1 : Math.min(1, Math.max(0, batch.staging));
	return (
		<span
			aria-hidden="true"
			className={cn(
				"absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-canvas",
				processing && "skeleton",
			)}
		>
			{processing ? null : (
				<span
					className="block h-full w-full origin-left bg-accent motion-safe:transition-transform"
					style={{ transform: `scaleX(${fraction})` }}
				/>
			)}
		</span>
	);
}

/**
 * The photo-batch strip (Tier 2b): the pending selection as size-24 tiles in a
 * wrapping grid, the gold Cover chip on the first, one counting label above
 * while the batch uploads, and a per-photo progress edge on every tile. Tiles
 * bind to real bytes during staging and to per-photo completion afterwards;
 * nothing fakes progress.
 */
export function EventPhotoStrip({
	files,
	batch,
}: Readonly<{ files: readonly File[]; batch?: EventBatchState | null }>) {
	const urls = useObjectUrls(files);
	if (files.length === 0) return null;
	const total = files.reduce((sum, file) => sum + file.size, 0);
	return (
		<div className="grid gap-1.5">
			{batch ? (
				<p role="status" className="text-label text-muted tabular-nums">
					Uploading {batch.done.size} of {batch.total} photo{batch.total === 1 ? "" : "s"}
				</p>
			) : null}
			<ul className="flex flex-wrap gap-2">
				{files.map((file, i) => (
					<li
						key={`${file.name}-${file.size}-${file.lastModified}`}
						className="relative size-24 overflow-hidden rounded-(--radius-sm) bg-canvas shadow-hairline"
					>
						{urls[i] ? (
							// biome-ignore lint/performance/noImgElement: local object URL preview, not a remote asset
							<img src={urls[i]} alt="" className="size-full object-cover" />
						) : null}
						{i === 0 ? <EventCoverChip /> : null}
						{batch ? <TileEdge batch={batch} index={i} /> : null}
					</li>
				))}
			</ul>
			<p className="text-label text-muted">
				{files.length} photo{files.length === 1 ? "" : "s"} selected, {formatBytes(total)}. The
				first is the cover.
			</p>
		</div>
	);
}
