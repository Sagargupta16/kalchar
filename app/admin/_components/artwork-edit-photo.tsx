"use client";

import { Palette } from "lucide-react";
import { useState } from "react";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminBtn, adminBtnPrimary, adminHelp, FOCUS_WITHIN, ICON_MD } from "./controls";
import { PHOTO_CHIP, PhotoPreview } from "./photo-preview";
import { UploadProgressEdge, type UploadProgressState } from "./upload-progress";

interface ArtworkEditPhotoProps {
	art: Artwork;
	thumb: string;
	pending: boolean;
	progress: UploadProgressState | null;
	onRefreshPalette: () => void;
	/** Resolves true when the new photo was written; the picker then clears. */
	onReplace: (file: File) => Promise<boolean>;
}

/**
 * The edit sheet's photo hero (Tier 1d): the whole painting, uncropped
 * (object-contain, unlike the grid's crop), with the Change photo chip over
 * its corner and the staged-replace progress edge riding its bottom edge.
 * Palette swatches and Refresh colours stay below (content kept).
 */
export function ArtworkEditPhoto({
	art,
	thumb,
	pending,
	progress,
	onRefreshPalette,
	onReplace,
}: Readonly<ArtworkEditPhotoProps>) {
	const [replacement, setReplacement] = useState<File | null>(null);

	const replace = async () => {
		if (!replacement) return;
		if (await onReplace(replacement)) setReplacement(null);
	};

	return (
		<fieldset disabled={pending} className="grid gap-3">
			<legend className="sr-only">Photo</legend>
			<div className="relative overflow-hidden rounded-(--radius-md) bg-canvas">
				{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
				<img src={thumb} alt="" className="aspect-post max-h-[40svh] w-full object-contain" />
				<label className={cn(PHOTO_CHIP, "absolute right-2 bottom-2", FOCUS_WITHIN)}>
					Change photo
					<input
						type="file"
						name="image"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => setReplacement(e.currentTarget.files?.[0] ?? null)}
						className="sr-only"
					/>
				</label>
				{progress ? <UploadProgressEdge state={progress} /> : null}
			</div>
			{progress ? (
				<p aria-live="polite" className={cn(adminHelp, "tabular-nums")}>
					{progress.label}
				</p>
			) : null}
			<div className="flex flex-wrap items-center gap-3">
				{art.palette && art.palette.length > 0 ? (
					<div className="flex gap-1.5" aria-hidden="true">
						{art.palette.slice(0, 5).map((hex) => (
							<span
								key={hex}
								className="size-5 rounded-full shadow-hairline"
								style={{ backgroundColor: hex }}
							/>
						))}
					</div>
				) : (
					<span className={adminHelp}>No colours sampled yet</span>
				)}
				<button type="button" onClick={onRefreshPalette} className={cn(adminBtn, "w-fit")}>
					<Palette size={ICON_MD} aria-hidden="true" />
					Refresh colours
				</button>
			</div>
			{replacement ? (
				<PhotoPreview file={replacement} disabled={pending} onClear={() => setReplacement(null)} />
			) : null}
			{replacement ? (
				<button type="button" onClick={replace} className={cn(adminBtnPrimary, "w-full sm:w-fit")}>
					Replace photo
				</button>
			) : null}
		</fieldset>
	);
}
