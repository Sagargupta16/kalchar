"use client";

import { cn } from "@/lib/utils";

export interface UploadProgressState {
	/** What is happening right now, e.g. "Sending your photo (5.2 MB)" or "Preparing photo sizes and colours". */
	label: string;
	/** 0 to 1 when the amount of work is known, null while it is not. */
	fraction: number | null;
}

/**
 * Slim progress bar for the admin upload flows. Determinate while bytes travel
 * to R2 (the browser knows how many), indeterminate while the server encodes
 * variants (it does not, so the existing skeleton sweep stands in). The live
 * region sits on the label only, so a screen reader hears each stage once and
 * not every byte chunk; the fill animates transform, never width.
 */
export function UploadProgress({ state }: Readonly<{ state: UploadProgressState }>) {
	const percent =
		state.fraction === null ? null : Math.round(Math.min(1, Math.max(0, state.fraction)) * 100);
	return (
		<div className="grid gap-1.5">
			<div className="flex items-center justify-between gap-3 text-label text-muted">
				<span aria-live="polite">{state.label}</span>
				{percent !== null ? <span className="tabular-nums">{percent}%</span> : null}
			</div>
			<div
				role="progressbar"
				aria-label={state.label}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent ?? undefined}
				className={cn(
					"h-1.5 w-full overflow-hidden rounded-full bg-canvas",
					percent === null && "skeleton",
				)}
			>
				{percent !== null ? (
					<div
						className="h-full w-full origin-left rounded-full bg-accent motion-safe:transition-transform"
						style={{ transform: `scaleX(${percent / 100})` }}
					/>
				) : null}
			</div>
		</div>
	);
}
