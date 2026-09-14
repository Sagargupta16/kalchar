"use client";

import { adminBtn } from "./controls";

/**
 * The add flow's success line on the 1.16 toast copy: `Added "{title}" to the
 * gallery` with View and Add another. Rendered inside the add sheet (the
 * shell owns the sheet's close, so the line stays in the sheet rather than a
 * BottomBar toast, which the top-layer dialog would occlude). The old
 * "Show in list" anchor is retired: the sheet covers the list.
 */
export function UploadSuccess({
	title,
	slug,
	onAddAnother,
}: Readonly<{ title: string; slug: string; onAddAnother?: () => void }>) {
	return (
		<output className="grid gap-3 text-sm text-accent-text">
			<span>Added "{title}" to the gallery</span>
			<span className="flex flex-wrap gap-2">
				<a href={`/work/${slug}/`} target="_blank" rel="noreferrer" className={adminBtn}>
					View
				</a>
				{onAddAnother ? (
					<button type="button" onClick={onAddAnother} className={adminBtn}>
						Add another
					</button>
				) : null}
			</span>
		</output>
	);
}
