"use client";

import { ImageOff, X } from "lucide-react";
import { useState } from "react";
import { cn, formatBytes } from "@/lib/utils";
import { adminIconBtnDestructive, adminThumb, ICON_MD } from "../_components/controls";
import { useObjectUrl } from "../_components/photo-preview";

const PROFILE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PROFILE_PHOTO_ACCEPT = [...PROFILE_PHOTO_TYPES].join(",");
export const PROFILE_PHOTO_MAX_MB = 20;

/** Keep this picker in sync with the metadata checks in stage-image.ts. */
export function validateProfilePhoto(file: File | null): string | null {
	if (!file) return null;
	if (file.size === 0) return `"${file.name}" is empty. Choose another photo.`;
	if (file.size > PROFILE_PHOTO_MAX_MB * 1024 * 1024) {
		return `"${file.name}" is too large. Choose a photo up to ${PROFILE_PHOTO_MAX_MB} MB.`;
	}
	if (!PROFILE_PHOTO_TYPES.has(file.type.toLowerCase())) {
		return `"${file.name}" is not supported. Choose a JPG, PNG or WebP photo.`;
	}
	return null;
}

export function ProfilePhotoDraft({
	file,
	invalid,
	uploading,
	disabled,
	onClear,
}: Readonly<{
	file: File;
	invalid: boolean;
	uploading: boolean;
	disabled: boolean;
	onClear: () => void;
}>) {
	const url = useObjectUrl(invalid ? null : file);
	const [failedUrl, setFailedUrl] = useState<string>();
	const previewFailed = url !== undefined && failedUrl === url;
	let status = "Not saved yet";
	if (invalid) status = "Choose another photo";
	else if (uploading) status = "Uploading…";
	else if (previewFailed) status = "Preview unavailable";

	return (
		<div className="flex w-full items-center gap-3 rounded-(--radius-sm) border border-line bg-surface p-(--card-pad-compact)">
			{url && !previewFailed && !invalid ? (
				// biome-ignore lint/performance/noImgElement: local object URL preview
				<img
					src={url}
					alt="Selected portrait"
					onError={() => setFailedUrl(url)}
					className={cn(adminThumb, "size-20 bg-canvas object-contain")}
				/>
			) : (
				<span
					aria-hidden="true"
					className={cn(adminThumb, "grid size-20 place-items-center bg-canvas text-muted")}
				>
					{invalid || previewFailed ? <ImageOff size={ICON_MD} /> : null}
				</span>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-ink" title={file.name}>
					{file.name}
				</p>
				<p className="text-label text-muted">
					{formatBytes(file.size)}, {status}
				</p>
			</div>
			<button
				type="button"
				onClick={onClear}
				disabled={disabled}
				aria-label="Remove selected image"
				className={adminIconBtnDestructive}
			>
				<X size={ICON_MD} aria-hidden="true" />
			</button>
		</div>
	);
}
