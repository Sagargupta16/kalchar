"use client";

import { cn } from "@/lib/utils";

export interface UploadProgressState {
	/** What is happening right now, e.g. "Sending your photo (5.2 MB)" or "Preparing photo sizes and colours". */
	label: string;
	/** 0 to 1 when the amount of work is known, null while it is not. */
	fraction: number | null;
}

/** Clamp a fraction into 0..100, or null while the work is unmeasured. */
function toPercent(fraction: number | null): number | null {
	return fraction === null ? null : Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

/**
 * Slim progress bar for the admin upload flows. Determinate while bytes travel
 * to R2 (the browser knows how many), indeterminate while the server encodes
 * variants (it does not, so the existing skeleton sweep stands in). The live
 * region sits on the label only, so a screen reader hears each stage once and
 * not every byte chunk; the fill animates transform, never width.
 */
export function UploadProgress({ state }: Readonly<{ state: UploadProgressState }>) {
	const percent = toPercent(state.fraction);
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
						className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-(--duration-fast) ease-(--ease-out)"
						style={{ transform: `scaleX(${percent / 100})` }}
					/>
				) : null}
			</div>
		</div>
	);
}

/**
 * The photo-edge variant (Tier 1c, 1d): a 4px fill riding the hero's bottom
 * edge inside a `relative` wrapper. Real bytes drive the transform-scaleX fill
 * (K1); the variants step keeps the honest skeleton sweep. The caller renders
 * the stage label below the photo.
 */
export function UploadProgressEdge({ state }: Readonly<{ state: UploadProgressState }>) {
	const percent = toPercent(state.fraction);
	return (
		<div
			role="progressbar"
			aria-label={state.label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent ?? undefined}
			className={cn(
				"absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-scrim/20",
				percent === null && "skeleton",
			)}
		>
			{percent !== null ? (
				<div
					className="h-full w-full origin-left bg-accent transition-transform duration-(--duration-fast) ease-(--ease-out)"
					style={{ transform: `scaleX(${percent / 100})` }}
				/>
			) : null}
		</div>
	);
}
