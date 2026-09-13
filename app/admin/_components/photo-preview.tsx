"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatBytes } from "@/lib/utils";
import { adminIconBtnDestructive, adminThumb, ICON_MD } from "./controls";

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

/**
 * The one image a maintainer just picked, shown large enough to recognise with
 * its name and size, so choosing a file visibly did something before "Add piece"
 * is pressed. The <img> waits for its URL, so no broken-image glyph flashes.
 */
export function PhotoPreview({
	file,
	onClear,
	disabled,
}: Readonly<{ file: File; onClear?: () => void; disabled?: boolean }>) {
	const files = useMemo(() => [file], [file]);
	const [url] = useObjectUrls(files);
	return (
		<div className="flex items-center gap-3 rounded-(--radius-sm) border border-line bg-surface p-(--card-pad-compact)">
			{url ? (
				// biome-ignore lint/performance/noImgElement: local object URL preview, not a remote asset
				<img src={url} alt="" className={cn(adminThumb, "size-20")} />
			) : (
				<span aria-hidden="true" className={cn(adminThumb, "size-20 bg-canvas")} />
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-ink">{file.name}</p>
				<p className="text-label text-muted">{formatBytes(file.size)}, ready to upload</p>
			</div>
			{onClear ? (
				<button
					type="button"
					onClick={onClear}
					disabled={disabled}
					aria-label="Remove selected image"
					className={adminIconBtnDestructive}
				>
					<X size={ICON_MD} aria-hidden="true" />
				</button>
			) : null}
		</div>
	);
}

/** The "Cover" chip on the first photo of a strip (11px Badge recipe, above the image). */
export function CoverBadge({ className }: Readonly<{ className?: string }>) {
	return (
		<Badge variant="accent" className={cn("absolute top-1 left-1 z-raised", className)}>
			Cover
		</Badge>
	);
}

/** A strip of thumbnails for a multi-photo selection, in the order they were picked. */
export function PhotoStrip({ files }: Readonly<{ files: readonly File[] }>) {
	const urls = useObjectUrls(files);
	if (files.length === 0) return null;
	const total = files.reduce((sum, file) => sum + file.size, 0);
	return (
		<div className="grid gap-1.5">
			<ul className="flex flex-wrap gap-2">
				{files.map((file, i) => (
					<li
						key={`${file.name}-${file.size}-${file.lastModified}`}
						className="relative size-16 overflow-hidden rounded-(--radius-sm) bg-canvas shadow-hairline"
					>
						{urls[i] ? (
							// biome-ignore lint/performance/noImgElement: local object URL preview, not a remote asset
							<img src={urls[i]} alt="" className="size-full object-cover" />
						) : null}
						{i === 0 ? <CoverBadge /> : null}
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
