"use client";

import { ImageUp, Palette } from "lucide-react";
import { useState } from "react";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	adminBtn,
	adminBtnPrimary,
	adminFilePicker,
	adminHelp,
	adminThumb,
	ICON_MD,
} from "./controls";
import { PhotoPreview } from "./photo-preview";
import { UploadProgress, type UploadProgressState } from "./upload-progress";

interface ArtworkEditPhotoProps {
	art: Artwork;
	thumb: string;
	pending: boolean;
	progress: UploadProgressState | null;
	fieldsetClassName: string;
	legendClassName: string;
	onRefreshPalette: () => void;
	/** Resolves true when the new photo was written; the picker then clears. */
	onReplace: (file: File) => Promise<boolean>;
}

/** The editor's Photo fieldset: current image and palette, Refresh colours, and the replace flow. */
export function ArtworkEditPhoto({
	art,
	thumb,
	pending,
	progress,
	fieldsetClassName,
	legendClassName,
	onRefreshPalette,
	onReplace,
}: Readonly<ArtworkEditPhotoProps>) {
	const [replacement, setReplacement] = useState<File | null>(null);

	const replace = async () => {
		if (!replacement) return;
		if (await onReplace(replacement)) setReplacement(null);
	};

	return (
		<fieldset disabled={pending} className={fieldsetClassName}>
			<legend className={legendClassName}>Photo</legend>
			<div className="flex items-center gap-4 sm:col-span-2">
				{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
				<img src={thumb} alt="" className={cn(adminThumb, "size-24")} />
				<div className="grid gap-3">
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
			</div>
			<div className="grid gap-3 sm:col-span-2">
				<label className={adminFilePicker}>
					<ImageUp size={ICON_MD} aria-hidden="true" />
					<span>{replacement ? "Change photo" : "Choose a new photo (JPG, PNG, or WebP)"}</span>
					<input
						type="file"
						name="image"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => setReplacement(e.currentTarget.files?.[0] ?? null)}
						className="sr-only"
					/>
				</label>
				{replacement ? (
					<PhotoPreview
						file={replacement}
						disabled={pending}
						onClear={() => setReplacement(null)}
					/>
				) : null}
				{progress ? <UploadProgress state={progress} /> : null}
				{replacement ? (
					<button
						type="button"
						onClick={replace}
						className={cn(adminBtnPrimary, "w-full sm:w-fit")}
					>
						Replace photo
					</button>
				) : null}
			</div>
		</fieldset>
	);
}
